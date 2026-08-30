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

assert.equal(validateImageDataUrl(VALID_PNG).ok, true, "valid 1x1 png should pass");
assert.equal(validateImageDataUrl(null).ok, false);
assert.equal(validateImageDataUrl("").ok, false);
assert.equal(validateImageDataUrl("https://evil.example/x.png").ok, false, "external URL should be rejected");
assert.equal(validateImageDataUrl("data:text/plain;base64,SGVsbG8=").ok, false, "non-image MIME should be rejected");
assert.equal(validateImageDataUrl("data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=").ok, false, "svg should be rejected");
assert.equal(validateImageDataUrl("data:image/gif;base64,R0lGODdh").ok, false, "gif should be rejected");
assert.equal(validateImageDataUrl("data:image/png;utf8,notbase64").ok, false, "non-base64 charset should be rejected");
assert.equal(validateImageDataUrl("data:image/png;base64,!!!").ok, false, "bad base64 should be rejected");
assert.equal(validateImageDataUrl("data:IMAGE/PNG;base64,AAA=").ok, true, "MIME should be case-insensitive");
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${"A".repeat(10000)}`, { maxBytes: 1000 }).ok,
  false,
  "oversized image should be rejected",
);
assert.equal(
  validateImageDataUrl(`data:image/png;base64,${"A".repeat(900)}`, { maxBytes: 1000 }).ok,
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
}

console.log("OCR service tests passed");