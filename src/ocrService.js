import { getAvailableCharacters } from "./strategyGenerator.js";

export function parseEnvLocal(text) {
  return text.split(/\r?\n/).reduce((env, line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) return env;

    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) return env;

    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
    return env;
  }, {});
}

export function parseJsonFromText(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const candidate = fenced ?? (start >= 0 && end > start ? text.slice(start, end + 1) : "");
  if (!candidate.trim()) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function numberFromEnv(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

// ---------------------------------------------------------------------------
// OCR 开关：本地默认开启（配合 env.local 的本地模型），生产默认关闭，
// 必须显式设置 OCR_ENABLED=true 才会启用线上 OCR 代理。
// ---------------------------------------------------------------------------

export function isProductionEnv(env = {}) {
  return env.VERCEL === "1" || Boolean(env.VERCEL_ENV);
}

export function isOcrEnabled(env = {}) {
  const raw = String(env.OCR_ENABLED ?? "").trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(raw)) return true;
  if (["0", "false", "no", "off"].includes(raw)) return false;
  return !isProductionEnv(env);
}

export function buildAiConfig(env) {
  const requestedTimeoutSeconds = numberFromEnv(env.OCR_TIMEOUT_SECONDS, 1200);
  const timeoutSeconds = isProductionEnv(env)
    ? Math.min(requestedTimeoutSeconds, 285)
    : requestedTimeoutSeconds;

  return {
    apiKey: env.API_KEY,
    apiUrl: env.API_URL,
    model: env.MODEL,
    maxTokens: numberFromEnv(env.MAX_TOKENS, 4000),
    timeoutMs: timeoutSeconds * 1000,
    useResponseFormatJson: String(env.USE_RESPONSE_FORMAT_JSON || "").toLowerCase() === "true",
  };
}

// GET /api/parse-screenshot 返回的状态，前端据此决定是否展示上传入口。
export function getOcrStatus(env = {}) {
  return {
    enabled: isOcrEnabled(env),
    mode: isProductionEnv(env) ? "production" : "local",
    timeoutSeconds: Math.round(buildAiConfig(env).timeoutMs / 1000),
  };
}

// ---------------------------------------------------------------------------
// 图片输入校验：只接受 data:image/png|jpeg|webp;base64,...，
// 拒绝外部 URL、SVG 和其他内容；限制解码后字节数。
// ---------------------------------------------------------------------------

export const ALLOWED_IMAGE_MIMES = ["png", "jpeg", "webp"];
export const DEFAULT_MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function maxImageBytesFromEnv(env = {}) {
  return numberFromEnv(env.OCR_MAX_IMAGE_BYTES, DEFAULT_MAX_IMAGE_BYTES);
}

export function validateImageDataUrl(imageDataUrl, { maxBytes = DEFAULT_MAX_IMAGE_BYTES } = {}) {
  if (typeof imageDataUrl !== "string" || imageDataUrl.length === 0) {
    return { ok: false, status: 400, code: "MISSING_IMAGE", message: "请求缺少 imageDataUrl。" };
  }

  const commaIndex = imageDataUrl.indexOf(",");
  const header = commaIndex >= 0 ? imageDataUrl.slice(0, commaIndex) : imageDataUrl;
  const payload = commaIndex >= 0 ? imageDataUrl.slice(commaIndex + 1) : "";

  if (!header.startsWith("data:")) {
    return {
      ok: false,
      status: 400,
      code: "UNSUPPORTED_IMAGE_SOURCE",
      message: "只接受 base64 编码的图片数据，不接受外部图片链接。",
    };
  }

  const mimeMatch = header.match(/^data:([^;,]+)/);
  const mime = mimeMatch ? mimeMatch[1].toLowerCase() : "";
  if (!mime.startsWith("image/")) {
    return { ok: false, status: 415, code: "UNSUPPORTED_MEDIA_TYPE", message: "只接受图片内容。" };
  }

  const subtype = mime.slice("image/".length);
  if (!ALLOWED_IMAGE_MIMES.includes(subtype)) {
    return {
      ok: false,
      status: 415,
      code: "UNSUPPORTED_MEDIA_TYPE",
      message: "只支持 PNG、JPEG 和 WebP 图片。",
    };
  }

  if (!header.includes(";base64")) {
    return {
      ok: false,
      status: 400,
      code: "UNSUPPORTED_IMAGE_ENCODING",
      message: "只接受 base64 编码的图片。",
    };
  }

  if (!/^[A-Za-z0-9+/=]*$/.test(payload)) {
    return { ok: false, status: 400, code: "MALFORMED_BASE64", message: "图片数据不是有效的 base64。" };
  }

  const approxBytes = Math.floor(payload.length / 4) * 3;
  if (approxBytes > maxBytes) {
    return {
      ok: false,
      status: 413,
      code: "IMAGE_TOO_LARGE",
      message: "图片过大，请裁剪或压缩后重试。",
    };
  }

  return { ok: true, mime: `image/${subtype}` };
}

// ---------------------------------------------------------------------------
// 角色上下文：客户端只提交角色 id，服务端从内部表查名称，
// 不接受客户端提供的任意角色文本（避免注入进提示词）。
// ---------------------------------------------------------------------------

export function resolveSelectedCharacter(selectedCharacter) {
  let id = null;
  if (typeof selectedCharacter === "string") {
    id = selectedCharacter.trim();
  } else if (selectedCharacter && typeof selectedCharacter === "object" && !Array.isArray(selectedCharacter)) {
    if (typeof selectedCharacter.id === "string") id = selectedCharacter.id.trim();
  }
  if (!id) return null;

  const character = getAvailableCharacters().find((entry) => entry.id === id);
  if (!character) return null;
  return { id: character.id, name: character.name, cnHint: character.cnHint };
}

// ---------------------------------------------------------------------------
// 速率限制：按客户端 IP 的滑动窗口 + 每日额度 + 并发上限。
// 内存状态在 Vercel 上按函数实例隔离，作为最小防护；本地单进程下完全生效。
// ---------------------------------------------------------------------------

const rateLimitState = {
  windows: new Map(),
  daily: new Map(),
  active: new Map(),
};

export function resetOcrRateLimitState() {
  rateLimitState.windows.clear();
  rateLimitState.daily.clear();
  rateLimitState.active.clear();
}

function pruneRateLimitMaps() {
  const limit = 10000;
  for (const map of [rateLimitState.windows, rateLimitState.daily, rateLimitState.active]) {
    if (map.size > limit) map.clear();
  }
}

export function checkOcrRateLimit(env = {}, clientIp = "unknown") {
  const now = Date.now();
  const perMinute = numberFromEnv(env.OCR_MAX_REQUESTS_PER_MINUTE, 10);
  const dailyQuota = numberFromEnv(env.OCR_DAILY_QUOTA, 100);
  const maxConcurrency = numberFromEnv(env.OCR_MAX_CONCURRENCY, 2);
  const ip = clientIp || "unknown";

  pruneRateLimitMaps();

  const active = rateLimitState.active.get(ip) ?? 0;
  if (active >= maxConcurrency) {
    return { allowed: false, code: "RATE_LIMITED", message: "并发 OCR 请求过多，请稍后再试。" };
  }

  const windowStart = now - 60_000;
  const entries = (rateLimitState.windows.get(ip) ?? []).filter((time) => time > windowStart);
  if (entries.length >= perMinute) {
    return { allowed: false, code: "RATE_LIMITED", message: "OCR 请求过于频繁，请一分钟后重试。" };
  }

  const dayKey = new Date(now).toISOString().slice(0, 10);
  const daily = rateLimitState.daily.get(ip);
  const dailyCount = daily && daily.day === dayKey ? daily.count : 0;
  if (dailyCount >= dailyQuota) {
    return { allowed: false, code: "QUOTA_EXCEEDED", message: "今日 OCR 额度已用完，请明天再试。" };
  }

  entries.push(now);
  rateLimitState.windows.set(ip, entries);
  rateLimitState.daily.set(ip, { day: dayKey, count: dailyCount + 1 });
  rateLimitState.active.set(ip, active + 1);
  return { allowed: true };
}

export function releaseOcrSlot(clientIp) {
  const ip = clientIp || "unknown";
  const active = (rateLimitState.active.get(ip) ?? 1) - 1;
  if (active <= 0) rateLimitState.active.delete(ip);
  else rateLimitState.active.set(ip, active);
}

// ---------------------------------------------------------------------------
// 提示词与上游调用
// ---------------------------------------------------------------------------

export function screenshotPrompt(selectedCharacter, { cropped = false } = {}) {
  const selectedCharacterLine = selectedCharacter
    ? `用户已手动选择当前角色：${selectedCharacter.name}（${selectedCharacter.cnHint}）。角色只用于上下文，不要输出角色字段。`
    : "用户没有手动选择角色；不要猜角色，也不要输出角色字段。";

  const scopeLine = cropped
    ? "图片已裁剪为右侧“属性”面板区域，请读取图中所有属性。"
    : "只读取右侧“属性”面板，不分析商店、道具卡、武器栏、价格、材料数。";

  return `你是 OCR 引擎，只负责读取 Brotato（土豆兄弟）截图右侧“属性”面板的文字和数字。

${selectedCharacterLine}

硬性规则：
- ${scopeLine}
- 只做 OCR：属性名后面是什么数字就输出什么数字，不推断、不补全、不解释。
- 绿色数字输出正数，红色负数保留负号，白色 0 输出 0。
- 只输出 JSON，不要 Markdown，不要解释，不要推理过程。
- 只输出 statsOcr，不要输出 characterId、weapons、items、shopCandidates。
- 无法确认的属性不要输出。

输出格式固定为：
{
  "statsOcr": [
    {"label": "当前等级", "value": 6},
    {"label": "诅咒", "value": 0},
    {"label": "最大生命值", "value": 27},
    {"label": "生命再生", "value": 0},
    {"label": "%生命窃取", "value": 0},
    {"label": "%伤害", "value": 8},
    {"label": "近战伤害", "value": 0},
    {"label": "远程伤害", "value": 0},
    {"label": "元素伤害", "value": 11},
    {"label": "%攻击速度", "value": 0},
    {"label": "%暴击率", "value": 3},
    {"label": "工程学", "value": 0},
    {"label": "范围", "value": 0},
    {"label": "护甲", "value": 0},
    {"label": "%闪避", "value": -2},
    {"label": "%速度", "value": -1},
    {"label": "幸运", "value": 25},
    {"label": "收获", "value": 0}
  ]
}
`;
}

function buildChatCompletionBody(config, imageDataUrl, selectedCharacter, cropped) {
  const body = {
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: screenshotPrompt(selectedCharacter, { cropped }) },
          { type: "image_url", image_url: { url: imageDataUrl } },
        ],
      },
    ],
  };

  if (config.useResponseFormatJson) {
    body.response_format = { type: "json_object" };
  }

  return body;
}

async function callUpstreamModel(env, imageDataUrl, selectedCharacter, cropped) {
  const config = buildAiConfig(env);
  const production = isProductionEnv(env);

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  let apiResponse;
  try {
    apiResponse = await fetch(`${config.apiUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(buildChatCompletionBody(config, imageDataUrl, selectedCharacter, cropped)),
      signal: controller.signal,
    });
  } catch (error) {
    if (error.name === "AbortError") {
      return {
        status: 504,
        body: {
          error: `OCR 请求超时：已等待 ${Math.round(config.timeoutMs / 1000)} 秒。`,
          code: "UPSTREAM_TIMEOUT",
        },
      };
    }
    return {
      status: 502,
      body: {
        error: production ? "上游模型服务不可达。" : `上游模型服务不可达：${error.message}`,
        code: "UPSTREAM_UNREACHABLE",
      },
    };
  } finally {
    clearTimeout(timeout);
  }

  const payload = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
    // 生产环境不透传完整上游 detail，只返回稳定错误码和通用说明。
    if (production) {
      return {
        status: 502,
        body: {
          error: "上游模型服务请求失败。",
          code: "UPSTREAM_ERROR",
        },
      };
    }
    return {
      status: apiResponse.status,
      body: {
        error: payload.error?.message || `OpenAI 兼容 API 请求失败：HTTP ${apiResponse.status}`,
        detail: payload,
      },
    };
  }

  const message = payload.choices?.[0]?.message ?? {};
  const text =
    (Array.isArray(message.content)
      ? message.content.map((part) => part.text ?? "").join("\n")
      : message.content) ||
    message.reasoning_content ||
    payload.choices?.[0]?.text ||
    "";

  return {
    status: 200,
    body: {
      text,
      parsed: parseJsonFromText(text),
      model: config.model,
    },
  };
}

// 统一入口：开关 → 配置 → 图片校验 → 限流 → 上游调用。
// 本函数不会 reject，所有失败都映射为 { status, body }。
export async function parseScreenshotWithOpenAi({
  env,
  imageDataUrl,
  selectedCharacter,
  cropped = false,
  clientIp = "unknown",
}) {
  if (!isOcrEnabled(env)) {
    return {
      status: 503,
      body: {
        error:
          "当前环境未启用 OCR。生产环境必须显式设置 OCR_ENABLED=true；本地开发使用 npm run start 并配置 env.local。",
        code: "OCR_DISABLED",
      },
    };
  }

  const config = buildAiConfig(env);
  if (!config.apiKey || !config.apiUrl || !config.model) {
    return {
      status: 500,
      body: { error: "缺少 API 配置：API_KEY、API_URL、MODEL。", code: "MISSING_CONFIG" },
    };
  }

  const validation = validateImageDataUrl(imageDataUrl, { maxBytes: maxImageBytesFromEnv(env) });
  if (!validation.ok) {
    return { status: validation.status, body: { error: validation.message, code: validation.code } };
  }

  const character = resolveSelectedCharacter(selectedCharacter);

  const limit = checkOcrRateLimit(env, clientIp);
  if (!limit.allowed) {
    return { status: 429, body: { error: limit.message, code: limit.code } };
  }

  try {
    return await callUpstreamModel(env, imageDataUrl, character, cropped);
  } catch {
    return {
      status: 500,
      body: { error: "内部服务器错误。", code: "INTERNAL_ERROR" },
    };
  } finally {
    releaseOcrSlot(clientIp);
  }
}