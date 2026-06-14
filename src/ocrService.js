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

export function screenshotPrompt(selectedCharacter) {
  const selectedCharacterLine = selectedCharacter
    ? `用户已手动选择当前角色：${selectedCharacter.name}（${selectedCharacter.cnHint}）。角色只用于上下文，不要输出角色字段。`
    : "用户没有手动选择角色；不要猜角色，也不要输出角色字段。";

  return `你是 OCR 引擎，只负责读取 Brotato（土豆兄弟）截图右侧“属性”面板的文字和数字。

${selectedCharacterLine}

硬性规则：
- 只读取右侧“属性”面板，不分析商店、道具卡、武器栏、价格、材料数。
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

export function buildAiConfig(env) {
  return {
    apiKey: env.API_KEY,
    apiUrl: env.API_URL,
    model: env.MODEL,
    maxTokens: Number(env.MAX_TOKENS || 4000),
    useResponseFormatJson: String(env.USE_RESPONSE_FORMAT_JSON || "").toLowerCase() === "true",
  };
}

function buildChatCompletionBody(config, imageDataUrl, selectedCharacter) {
  const body = {
    model: config.model,
    max_tokens: config.maxTokens,
    temperature: 0.1,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: screenshotPrompt(selectedCharacter) },
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

export async function parseScreenshotWithOpenAi({ env, imageDataUrl, selectedCharacter }) {
  const config = buildAiConfig(env);
  if (!config.apiKey || !config.apiUrl || !config.model) {
    return {
      status: 500,
      body: {
        error: "缺少 API 配置：API_KEY、API_URL、MODEL。",
      },
    };
  }

  if (!imageDataUrl || typeof imageDataUrl !== "string") {
    return {
      status: 400,
      body: { error: "请求缺少 imageDataUrl。" },
    };
  }

  const apiResponse = await fetch(`${config.apiUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(buildChatCompletionBody(config, imageDataUrl, selectedCharacter)),
  });

  const payload = await apiResponse.json().catch(() => ({}));
  if (!apiResponse.ok) {
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
