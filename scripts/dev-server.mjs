import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { extname, join, normalize, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const port = Number(process.env.PORT || 5174);

const mimeTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

function parseEnvLocal(text) {
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

function loadAiConfig() {
  const envPath = join(rootDir, "env.local");
  const fileEnv = existsSync(envPath) ? parseEnvLocal(readFileSync(envPath, "utf8")) : {};
  return {
    apiKey: process.env.API_KEY || fileEnv.API_KEY,
    apiUrl: process.env.API_URL || fileEnv.API_URL,
    model: process.env.MODEL || fileEnv.MODEL,
    maxTokens: Number(process.env.MAX_TOKENS || fileEnv.MAX_TOKENS || 4000),
  };
}

function readRequestJson(request) {
  return new Promise((resolveJson, rejectJson) => {
    let body = "";
    request.on("data", (chunk) => {
      body += chunk;
      if (body.length > 15 * 1024 * 1024) {
        rejectJson(new Error("上传图片过大，请裁剪后重试。"));
        request.destroy();
      }
    });
    request.on("end", () => {
      try {
        resolveJson(JSON.parse(body || "{}"));
      } catch {
        rejectJson(new Error("请求体不是有效 JSON。"));
      }
    });
    request.on("error", rejectJson);
  });
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(payload));
}

function parseJsonFromText(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text.slice(text.indexOf("{"), text.lastIndexOf("}") + 1);
  if (!candidate.trim()) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function screenshotPrompt() {
  return `你是 Brotato（土豆兄弟）局内截图解析器。请从截图中识别当前局面，并只输出 JSON。

优先输出这些字段，无法识别就省略，不要编造：
{
  "characterName": "角色名，中文或英文",
  "wave": 12,
  "mode": "normal20 或 endless，如果能判断",
  "stats": {
    "maxHp": 0,
    "hpRegen": 0,
    "lifeSteal": 0,
    "armor": 0,
    "dodge": 0,
    "damagePercent": 0,
    "attackSpeed": 0,
    "critChance": 0,
    "meleeDamage": 0,
    "rangedDamage": 0,
    "elementalDamage": 0,
    "engineering": 0,
    "speed": 0,
    "harvesting": 0,
    "luck": 0
  },
  "weapon": {
    "name": "当前主要武器名",
    "quantity": 1,
    "baseDamage": 0,
    "cooldown": 1,
    "hitsPerAttack": 1,
    "piercing": 0,
    "piercingDamageMultiplier": 0.5,
    "bounces": 0,
    "bounceDamageMultiplier": 0.5,
    "explosionTargets": 0,
    "explosionDamageMultiplier": 1,
    "critChance": 0,
    "critMultiplier": 2,
    "scaling": {
      "meleeDamage": 0,
      "rangedDamage": 0,
      "elementalDamage": 0,
      "engineering": 0
    }
  },
  "scenarioId": "bossElite | normalWave | swarm",
  "itemEffectId": "none | cyberball | babyElephant | babyWithABeard",
  "notes": ["识别依据或不确定项"]
}

百分比字段直接输出数字，例如 25% 输出 25。只输出 JSON，不要 Markdown。`;
}

async function handleParseScreenshot(request, response) {
  try {
    const config = loadAiConfig();
    if (!config.apiKey || !config.apiUrl || !config.model) {
      sendJson(response, 500, {
        error: "缺少 env.local 配置：API_KEY、API_URL、MODEL。",
      });
      return;
    }

    const { imageDataUrl } = await readRequestJson(request);
    if (!imageDataUrl || typeof imageDataUrl !== "string") {
      sendJson(response, 400, { error: "请求缺少 imageDataUrl。" });
      return;
    }

    const apiResponse = await fetch(`${config.apiUrl.replace(/\/$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        max_tokens: config.maxTokens,
        temperature: 0.1,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: screenshotPrompt() },
              { type: "image_url", image_url: { url: imageDataUrl } },
            ],
          },
        ],
      }),
    });

    const payload = await apiResponse.json().catch(() => ({}));
    if (!apiResponse.ok) {
      sendJson(response, apiResponse.status, {
        error: payload.error?.message || `LM Studio 请求失败：HTTP ${apiResponse.status}`,
        detail: payload,
      });
      return;
    }

    const text = payload.choices?.[0]?.message?.content ?? "";
    sendJson(response, 200, {
      text,
      parsed: parseJsonFromText(text),
      model: config.model,
    });
  } catch (error) {
    sendJson(response, 500, { error: error.message });
  }
}

function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || "127.0.0.1"}`);
  const pathname = decodeURIComponent(url.pathname);
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const filePath = normalize(join(rootDir, requestedPath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  if (!existsSync(filePath)) {
    response.writeHead(404);
    response.end("Not found");
    return;
  }

  response.writeHead(200, {
    "Content-Type": mimeTypes[extname(filePath)] || "application/octet-stream",
  });
  response.end(readFileSync(filePath));
}

const server = createServer((request, response) => {
  if (request.method === "POST" && request.url?.startsWith("/api/parse-screenshot")) {
    handleParseScreenshot(request, response);
    return;
  }

  if (request.method !== "GET" && request.method !== "HEAD") {
    response.writeHead(405);
    response.end("Method not allowed");
    return;
  }

  serveStatic(request, response);
});

server.listen(port, () => {
  console.log(`Brotato Number Lab running at http://127.0.0.1:${port}`);
});
