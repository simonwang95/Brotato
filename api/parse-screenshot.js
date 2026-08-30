import {
  getOcrStatus,
  parseScreenshotWithOpenAi,
} from "../src/ocrService.js";

// 请求体上限：Vercel Functions 的请求体平台上限是 4.5 MB，
// 超过的请求在函数代码运行前就被平台拒绝；本地与线上保持同一口径。
const MAX_BODY_BYTES = Math.floor(4.5 * 1024 * 1024);

function clientIpFromRequest(request) {
  const forwarded = request.headers?.["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  const real = request.headers?.["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  const connecting = request.headers?.["cf-connecting-ip"];
  if (typeof connecting === "string" && connecting.trim()) return connecting.trim();
  return "unknown";
}

// Vercel 会把 application/json 请求体自动解析成对象；
// 本地开发服务器（和部分客户端）传的是原始字符串。两种形态都要支持，
// 否则正常上传会被当成空对象而返回 MISSING_IMAGE。
function extractPayload(body) {
  if (body === undefined || body === null) return {};

  let parsed;
  if (typeof body === "string") {
    if (!body.trim()) return {};
    parsed = JSON.parse(body); // 解析失败会抛异常 → INVALID_JSON
  } else if (typeof body === "object") {
    parsed = body; // Vercel 已解析
  } else {
    throw new Error("invalid payload");
  }

  // JSON 原始值（数字/布尔/null）和数组都不是合法载荷 → INVALID_JSON
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error("invalid payload");
  }
  return parsed;
}

export default function handler(request, response) {
  if (request.method === "GET") {
    // 前端用这个状态决定是否展示上传入口，以及展示哪种隐私说明。
    response.status(200).json(getOcrStatus(process.env));
    return;
  }

  if (request.method !== "POST") {
    response.status(405).json({ error: "Method not allowed", code: "METHOD_NOT_ALLOWED" });
    return;
  }

  let payload;
  try {
    // request.body 在 Vercel 上可能是一个会抛出 JSON 解析异常的 getter；
    // 读取、大小检查和载荷解析必须全部位于同一个异常边界内。
    const body = request.body;
    if (typeof body === "string" && Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES) {
      response.status(413).json({ error: "请求体过大。", code: "BODY_TOO_LARGE" });
      return;
    }
    payload = extractPayload(body);
  } catch {
    response.status(400).json({ error: "请求体不是有效 JSON。", code: "INVALID_JSON" });
    return;
  }

  parseScreenshotWithOpenAi({
    env: process.env,
    imageDataUrl: payload?.imageDataUrl,
    selectedCharacter: payload?.selectedCharacter,
    cropped: payload?.cropped === true,
    clientIp: clientIpFromRequest(request),
  })
    .then((result) => {
      response.status(result.status).json(result.body);
    })
    .catch(() => {
      // 统一入口内部已捕获全部异常；这里是最后兜底，不透传内部细节。
      response.status(500).json({ error: "内部服务器错误。", code: "INTERNAL_ERROR" });
    });
}
