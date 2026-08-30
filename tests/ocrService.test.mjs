import assert from "node:assert/strict";
import {
  buildAiConfig,
  isOcrEnabled,
  getOcrStatus,
  validateImageDataUrl,
  resolveSelectedCharacter,
  checkOcrRateLimit,
  releaseOcrSlot,
  resetOcrRateLimitState,
} from "../src/ocrService.js";

// ---------------------------------------------------------------------------
// buildAiConfig 超时行为（原有断言，必须保持通过）
// ---------------------------------------------------------------------------
assert.equal(
  buildAiConfig({}).timeoutMs,
  1_200_000,
  "local OCR should keep the 1200 second default timeout",
);

assert.equal(
  buildAiConfig({ VERCEL: "1", OCR_TIMEOUT_SECONDS: "1200" }).timeoutMs,
  285_000,
  "Vercel OCR should finish before the 300 second function limit",
);

assert.equal(
  buildAiConfig({ VERCEL_ENV: "production", OCR_TIMEOUT_SECONDS: "120" }).timeoutMs,
  120_000,
  "Vercel OCR should preserve an explicitly shorter timeout",
);

// ---------------------------------------------------------------------------
// 环境开关：本地默认开启，生产默认关闭，显式值优先
// ---------------------------------------------------------------------------
assert.equal(isOcrEnabled({}), true, "local default should be enabled");
assert.equal(isOcrEnabled({ VERCEL: "1" }), false, "production default should be disabled");
assert.equal(isOcrEnabled({ VERCEL_ENV: "production" }), false, "VERCEL_ENV production should be disabled");
assert.equal(isOcrEnabled({ VERCEL_ENV: "preview" }), false, "any VERCEL_ENV should be production");
assert.equal(isOcrEnabled({ OCR_ENABLED: "true" }), true, "explicit true wins");
assert.equal(isOcrEnabled({ VERCEL: "1", OCR_ENABLED: "true" }), true, "explicit true wins in production");
assert.equal(isOcrEnabled({ VERCEL: "1", OCR_ENABLED: "false" }), false, "explicit false wins");
assert.equal(isOcrEnabled({ OCR_ENABLED: "0" }), false, "0 should disable");
assert.equal(isOcrEnabled({ OCR_ENABLED: "yes" }), true, "truthy string should enable");

// ---------------------------------------------------------------------------
// 状态接口
// ---------------------------------------------------------------------------
{
  const local = getOcrStatus({});
  assert.equal(local.enabled, true);
  assert.equal(local.mode, "local");
  assert.equal(local.timeoutSeconds, 1200);

  const prod = getOcrStatus({ VERCEL: "1" });
  assert.equal(prod.enabled, false);
  assert.equal(prod.mode, "production");
  assert.equal(prod.timeoutSeconds, 285);
}

// ---------------------------------------------------------------------------
// 图片输入校验
// ---------------------------------------------------------------------------
const VALID_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

// 用真实格式的头部构造测试图片（校验器会检查魔数和像素尺寸）
function makePng(width, height, padBytes = 0) {
  const header = Buffer.alloc(33);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(header, 0);
  header.writeUInt32BE(13, 8); // IHDR length
  Buffer.from("IHDR").copy(header, 12);
  header.writeUInt32BE(width, 16);
  header.writeUInt32BE(height, 20);
  header[24] = 8; // bit depth
  header[25] = 2; // color type RGB
  const pad = padBytes ? Buffer.alloc(padBytes, 0) : Buffer.alloc(0);
  return Buffer.concat([header, pad]);
}

function makeJpeg(width, height) {
  const soi = Buffer.from([0xff, 0xd8]);
  const sof = Buffer.alloc(15);
  sof[0] = 0xff;
  sof[1] = 0xc0; // SOF0
  sof.writeUInt16BE(0x000b, 2);
  sof[4] = 0x08; // precision
  sof.writeUInt16BE(height, 5);
  sof.writeUInt16BE(width, 7);
  sof[9] = 0x01; // one component
  const eoi = Buffer.from([0xff, 0xd9]);
  return Buffer.concat([soi, sof, eoi]);
}

function makeWebpLossless(width, height) {
  const data = Buffer.alloc(25);
  Buffer.from("RIFF").copy(data, 0);
  data.writeUInt32LE(22, 4);
  Buffer.from("WEBP").copy(data, 8);
  Buffer.from("VP8L").copy(data, 12);
  data.writeUInt32LE(10, 16);
  data[20] = 0x2f; // VP8L signature
  data.writeUInt32LE(((height - 1) << 14) | (width - 1), 21);
  return data;
}

function makeWebpLossy(width, height) {
  const data = Buffer.alloc(30);
  Buffer.from("RIFF").copy(data, 0);
  data.writeUInt32LE(26, 4);
  Buffer.from("WEBP").copy(data, 8);
  Buffer.from("VP8 ").copy(data, 12);
  data.writeUInt32LE(14, 16);
  data[20] = 0x30;
  data[21] = 0x01;
  data[22] = 0x00;
  data[23] = 0x9d;
  data[24] = 0x01;
  data[25] = 0x2a; // start code
  data.writeUInt16LE(width & 0x3fff, 26);
  data.writeUInt16LE(height & 0x3fff, 28);
  return data;
}

function makeWebpExtended(width, height) {
  const data = Buffer.alloc(30);
  Buffer.from("RIFF").copy(data, 0);
  data.writeUInt32LE(26, 4);
  Buffer.from("WEBP").copy(data, 8);
  Buffer.from("VP8X").copy(data, 12);
  data.writeUInt32LE(10, 16);
  data[20] = 0x00; // flags
  data.writeUIntLE(width - 1, 24, 3);
  data.writeUIntLE(height - 1, 27, 3);
  return data;
}

const VALID_JPEG = `data:image/jpeg;base64,${makeJpeg(1, 1).toString("base64")}`;
const VALID_WEBP = `data:image/webp;base64,${makeWebpLossless(1, 1).toString("base64")}`;

// 正常路径
assert.equal(validateImageDataUrl(VALID_PNG).ok, true, "valid 1x1 png should pass");
assert.equal(validateImageDataUrl(VALID_JPEG).ok, true, "valid 1x1 jpeg should pass");
assert.equal(validateImageDataUrl(VALID_WEBP).ok, true, "valid 1x1 webp should pass");
assert.equal(validateImageDataUrl(null).ok, false);
assert.equal(validateImageDataUrl("").ok, false);
assert.equal(validateImageDataUrl("https://evil.example/x.png").ok, false, "external URL should be rejected");
assert.equal(validateImageDataUrl("data:text/plain;base64,SGVsbG8=").ok, false, "non-image MIME should be rejected");
assert.equal(validateImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=").ok, false, "svg should be rejected");
assert.equal(validateImageDataUrl("data:image/gif;base64,R0lGODdh").ok, false, "gif should be rejected");
assert.equal(validateImageDataUrl("data:image/png;utf8,notbase64").ok, false, "non-base64 charset should be rejected");

// MIME 大小写不敏感（用真实 PNG 内容）
assert.equal(
  validateImageDataUrl(`data:IMAGE/PNG;base64,${makePng(1, 1).toString("base64")}`).ok,
  true,
  "MIME should be case-insensitive",
);

// 严格 base64：空内容、坏填充、非法字符
assert.equal(validateImageDataUrl("data:image/png;base64,").ok, false, "empty payload should be rejected");
assert.equal(validateImageDataUrl("data:image/png;base64,").code, "EMPTY_IMAGE");
assert.equal(validateImageDataUrl("data:image/png;base64,A").ok, false, "single char without padding should be rejected");
assert.equal(validateImageDataUrl("data:image/png;base64,A").code, "MALFORMED_BASE64");
assert.equal(validateImageDataUrl("data:image/png;base64,====").ok, false, "padding-only should be rejected");
assert.equal(validateImageDataUrl("data:image/png;base64,====").code, "MALFORMED_BASE64");
assert.equal(validateImageDataUrl("data:image/png;base64,!!!").ok, false, "bad base64 should be rejected");

// 魔数与尺寸：内容必须与声明格式一致且可解析
assert.equal(validateImageDataUrl("data:image/png;base64,SGVsbG8=").ok, false, "Hello marked as PNG should be rejected");
assert.equal(validateImageDataUrl("data:image/png;base64,SGVsbG8=").code, "INVALID_IMAGE_DATA");
assert.equal(
  validateImageDataUrl(`data:image/jpeg;base64,${makePng(1, 1).toString("base64")}`).ok,
  false,
  "PNG bytes declared as JPEG should be rejected",
);
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makeJpeg(1, 1).toString("base64")}`).ok,
  false,
  "JPEG bytes declared as PNG should be rejected",
);
assert.equal(
  validateImageDataUrl(`data:image/webp;base64,${makePng(1, 1).toString("base64")}`).ok,
  false,
  "PNG bytes declared as WebP should be rejected",
);
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makePng(1, 1, 0).subarray(0, 20).toString("base64")}`).ok,
  false,
  "truncated PNG without full IHDR should be rejected",
);

// 尺寸解析
assert.deepEqual(
  validateImageDataUrl(`data:image/png;base64,${makePng(640, 480).toString("base64")}`).dimensions,
  { width: 640, height: 480 },
);
assert.deepEqual(
  validateImageDataUrl(`data:image/jpeg;base64,${makeJpeg(1920, 1080).toString("base64")}`).dimensions,
  { width: 1920, height: 1080 },
);
assert.deepEqual(
  validateImageDataUrl(`data:image/webp;base64,${makeWebpLossless(3, 2).toString("base64")}`).dimensions,
  { width: 3, height: 2 },
);
assert.deepEqual(
  validateImageDataUrl(`data:image/webp;base64,${makeWebpLossy(320, 240).toString("base64")}`).dimensions,
  { width: 320, height: 240 },
);
assert.deepEqual(
  validateImageDataUrl(`data:image/webp;base64,${makeWebpExtended(100, 50).toString("base64")}`).dimensions,
  { width: 100, height: 50 },
);

// 尺寸上限
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makePng(20000, 10).toString("base64")}`, {
    maxDimension: 12000,
  }).ok,
  false,
  "oversized dimensions should be rejected",
);
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makePng(20000, 10).toString("base64")}`, {
    maxDimension: 12000,
  }).code,
  "IMAGE_DIMENSIONS_TOO_LARGE",
);
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makePng(12000, 10).toString("base64")}`, {
    maxDimension: 12000,
  }).ok,
  true,
  "dimensions at the limit should pass",
);

// 字节上限（真实 PNG 头部 + 填充）
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makePng(1, 1, 2000).toString("base64")}`, {
    maxBytes: 1000,
  }).ok,
  false,
  "oversized image should be rejected",
);
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makePng(1, 1, 2000).toString("base64")}`, {
    maxBytes: 1000,
  }).code,
  "IMAGE_TOO_LARGE",
);
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${makePng(1, 1).toString("base64")}`, {
    maxBytes: 1000,
  }).ok,
  true,
  "image under the limit should pass",
);

// ---------------------------------------------------------------------------
// 角色解析：只信任 id，名称一律来自内部表
// ---------------------------------------------------------------------------
{
  const ranger = resolveSelectedCharacter("ranger");
  assert.equal(ranger.id, "ranger");
  assert.equal(ranger.name, "Ranger");
  assert.ok(typeof ranger.cnHint === "string");

  const objectForm = resolveSelectedCharacter({ id: "ranger", name: "EVIL <script>" });
  assert.equal(objectForm.id, "ranger");
  assert.equal(objectForm.name, "Ranger", "client-supplied name must be ignored");
  assert.ok(!JSON.stringify(objectForm).includes("EVIL"));

  assert.equal(resolveSelectedCharacter("not-a-character"), null, "unknown id should be null");
  assert.equal(resolveSelectedCharacter({ id: "nope" }), null);
  assert.equal(resolveSelectedCharacter(null), null);
  assert.equal(resolveSelectedCharacter(undefined), null);
  assert.equal(resolveSelectedCharacter(42), null);
}

// ---------------------------------------------------------------------------
// 限流器：窗口、并发、每日额度
// ---------------------------------------------------------------------------
{
  const env = {};
  resetOcrRateLimitState();

  const limitedEnv = { ...env, OCR_MAX_REQUESTS_PER_MINUTE: "2", OCR_MAX_CONCURRENCY: "5" };
  assert.equal(checkOcrRateLimit(limitedEnv, "ip-a").allowed, true);
  assert.equal(checkOcrRateLimit(limitedEnv, "ip-a").allowed, true);
  const third = checkOcrRateLimit(limitedEnv, "ip-a");
  assert.equal(third.allowed, false, "third request within window should be limited");
  assert.equal(third.code, "RATE_LIMITED");
  assert.equal(checkOcrRateLimit(limitedEnv, "ip-b").allowed, true, "other IPs are independent");

  // 并发：占用槽位不释放时第二个请求被拒绝
  resetOcrRateLimitState();
  const concEnv = { ...env, OCR_MAX_REQUESTS_PER_MINUTE: "100", OCR_MAX_CONCURRENCY: "1" };
  assert.equal(checkOcrRateLimit(concEnv, "ip-c").allowed, true);
  const blocked = checkOcrRateLimit(concEnv, "ip-c");
  assert.equal(blocked.allowed, false, "second concurrent request should be limited");
  assert.equal(blocked.code, "RATE_LIMITED");
  releaseOcrSlot("ip-c");
  assert.equal(checkOcrRateLimit(concEnv, "ip-c").allowed, true, "released slot should allow a new request");

  // 每日额度
  resetOcrRateLimitState();
  const quotaEnv = { ...env, OCR_MAX_REQUESTS_PER_MINUTE: "100", OCR_DAILY_QUOTA: "1" };
  assert.equal(checkOcrRateLimit(quotaEnv, "ip-d").allowed, true);
  const overQuota = checkOcrRateLimit(quotaEnv, "ip-d");
  assert.equal(overQuota.allowed, false);
  assert.equal(overQuota.code, "QUOTA_EXCEEDED");

  // 全局并发：各 IP 未超每 IP 并发，但总并发超限仍应拒绝
  resetOcrRateLimitState();
  const totalEnv = {
    ...env,
    OCR_MAX_REQUESTS_PER_MINUTE: "100",
    OCR_MAX_CONCURRENCY: "5",
    OCR_MAX_TOTAL_CONCURRENCY: "2",
  };
  assert.equal(checkOcrRateLimit(totalEnv, "ip-e").allowed, true);
  assert.equal(checkOcrRateLimit(totalEnv, "ip-f").allowed, true);
  const overTotal = checkOcrRateLimit(totalEnv, "ip-g");
  assert.equal(overTotal.allowed, false, "third concurrent request across IPs should be limited");
  assert.equal(overTotal.code, "RATE_LIMITED");
  releaseOcrSlot("ip-e");
  assert.equal(checkOcrRateLimit(totalEnv, "ip-g").allowed, true, "released global slot should allow a new request");
}

console.log("OCR service tests passed");