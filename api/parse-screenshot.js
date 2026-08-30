import {
  getOcrStatus,
  parseScreenshotWithOpenAi,
} from "../src/ocrService.js";

// 请求体上限：base64 数据 URL 约为二进制体积的 1.34 倍，
// 15 MB 图片上限对应约 20 MB 请求体，这里放宽到 25 MB 再校验图片本身。
const MAX_BODY_BYTES = 25 * 1024 * 1024;

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

  const rawBody = typeof request.body === "string" ? request.body : "";
  if (rawBody.length > MAX_BODY_BYTES) {
    response.status(413).json({ error: "请求体过大。", code: "BODY_TOO_LARGE" });
    return;
  }

  let payload;
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    response.status(400).json({ error: "请求体不是有效 JSON。", code: "INVALID_JSON" });
    return;
  }

  if (payload && typeof payload !== "object" && !Array.isArray(payload)) {
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
