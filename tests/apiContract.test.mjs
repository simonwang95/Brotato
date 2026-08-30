import assert from "node:assert/strict";
import handler from "../api/parse-screenshot.js";

// ---------------------------------------------------------------------------
// 测试工具
// ---------------------------------------------------------------------------

const ENV_KEYS = [
  "VERCEL",
  "VERCEL_ENV",
  "OCR_ENABLED",
  "API_KEY",
  "API_URL",
  "MODEL",
  "MAX_TOKENS",
  "OCR_TIMEOUT_SECONDS",
  "USE_RESPONSE_FORMAT_JSON",
  "OCR_MAX_IMAGE_BYTES",
  "OCR_MAX_REQUESTS_PER_MINUTE",
  "OCR_DAILY_QUOTA",
  "OCR_MAX_CONCURRENCY",
];

const savedEnv = {};
for (const key of ENV_KEYS) {
  savedEnv[key] = process.env[key];
  delete process.env[key];
}

function setEnv(overrides) {
  for (const key of ENV_KEYS) delete process.env[key];
  for (const [key, value] of Object.entries(overrides)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function restoreEnv() {
  for (const key of ENV_KEYS) {
    if (savedEnv[key] === undefined) delete process.env[key];
    else process.env[key] = savedEnv[key];
  }
}

const originalFetch = globalThis.fetch;

function makeResponse() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

// handler 内部通过 promise 链设置响应，这里等待宏任务让链完成。
async function callHandler({ method = "POST", body = "", headers = {} } = {}) {
  const response = makeResponse();
  handler({ method, body, headers }, response);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return response;
}

// 1x1 PNG
const VALID_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";

function jsonBody(object) {
  return JSON.stringify(object);
}

function mockFetch(behavior) {
  const calls = [];
  globalThis.fetch = (url, options) => {
    calls.push({ url, options });
    return behavior(url, options, calls.length);
  };
  return calls;
}

function restoreFetch() {
  globalThis.fetch = originalFetch;
}

function okCompletionResponse(text) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: text } }],
    }),
  };
}

const PRODUCTION_BASE = {
  VERCEL: "1",
  OCR_ENABLED: "true",
  API_KEY: "test-key",
  API_URL: "http://model.example/v1",
  MODEL: "test-model",
};

// ---------------------------------------------------------------------------
// 1. 生产环境默认关闭 OCR
// ---------------------------------------------------------------------------
setEnv({ VERCEL: "1" });
{
  const status = await callHandler({ method: "GET" });
  assert.equal(status.statusCode, 200);
  assert.equal(status.body.enabled, false, "生产环境未显式启用时 OCR 应关闭");
  assert.equal(status.body.mode, "production");

  const res = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(res.statusCode, 503, "生产环境默认应返回 503");
  assert.equal(res.body.code, "OCR_DISABLED");
}

// 本地默认开启
setEnv({});
{
  const status = await callHandler({ method: "GET" });
  assert.equal(status.statusCode, 200);
  assert.equal(status.body.enabled, true, "本地环境默认应启用 OCR");
  assert.equal(status.body.mode, "local");
}

// ---------------------------------------------------------------------------
// 方法限制
// ---------------------------------------------------------------------------
setEnv(PRODUCTION_BASE);
{
  const res = await callHandler({ method: "PUT", body: "" });
  assert.equal(res.statusCode, 405);
  assert.equal(res.body.code, "METHOD_NOT_ALLOWED");
}

// ---------------------------------------------------------------------------
// 请求体边界
// ---------------------------------------------------------------------------
{
  const res = await callHandler({ body: "not-json" });
  assert.equal(res.statusCode, 400);
  assert.equal(res.body.code, "INVALID_JSON");

  const resEmpty = await callHandler({ body: "" });
  assert.equal(resEmpty.statusCode, 400, "空请求体应缺少 imageDataUrl");
  assert.equal(resEmpty.body.code, "MISSING_IMAGE");

  const oversized = jsonBody({ imageDataUrl: "a".repeat(25 * 1024 * 1024 + 1) });
  const resLarge = await callHandler({ body: oversized });
  assert.equal(resLarge.statusCode, 413, "超过请求体上限应返回 413");
  assert.equal(resLarge.body.code, "BODY_TOO_LARGE");
}

// ---------------------------------------------------------------------------
// 图片输入校验
// ---------------------------------------------------------------------------
{
  const cases = [
    [{}, 400, "MISSING_IMAGE"],
    [{ imageDataUrl: null }, 400, "MISSING_IMAGE"],
    [{ imageDataUrl: "https://evil.example/x.png" }, 400, "UNSUPPORTED_IMAGE_SOURCE"],
    [{ imageDataUrl: "blob:http://example/x" }, 400, "UNSUPPORTED_IMAGE_SOURCE"],
    [{ imageDataUrl: "data:text/plain;base64,SGVsbG8=" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    [{ imageDataUrl: "data:image/svg+xml;base64,PHN2Zz48L3N2Zz4=" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    [{ imageDataUrl: "data:image/gif;base64,R0lGODdh" }, 415, "UNSUPPORTED_MEDIA_TYPE"],
    [{ imageDataUrl: "data:image/png;utf8,notbase64" }, 400, "UNSUPPORTED_IMAGE_ENCODING"],
    [{ imageDataUrl: "data:image/png;base64,!!!" }, 400, "MALFORMED_BASE64"],
  ];

  const calls = mockFetch(() => Promise.resolve(okCompletionResponse("{}")));
  for (const [payload, expectedStatus, expectedCode] of cases) {
    const res = await callHandler({ body: jsonBody(payload) });
    assert.equal(res.statusCode, expectedStatus, `case ${JSON.stringify(payload)}`);
    assert.equal(res.body.code, expectedCode, `case ${JSON.stringify(payload)}`);
  }
  assert.equal(calls.length, 0, "非法输入不应调用上游模型");
  restoreFetch();
}

// 超大图片（OCR_MAX_IMAGE_BYTES 收紧后触发 413）
{
  setEnv({ ...PRODUCTION_BASE, OCR_MAX_IMAGE_BYTES: "1000" });
  const bigBase64 = "A".repeat(4096);
  const calls = mockFetch(() => Promise.resolve(okCompletionResponse("{}")));
  const res = await callHandler({ body: jsonBody({ imageDataUrl: `data:image/png;base64,${bigBase64}` }) });
  assert.equal(res.statusCode, 413);
  assert.equal(res.body.code, "IMAGE_TOO_LARGE");
  assert.equal(calls.length, 0, "超大图片不应调用上游模型");
  restoreFetch();
  setEnv(PRODUCTION_BASE);
}

// ---------------------------------------------------------------------------
// 成功路径
// ---------------------------------------------------------------------------
{
  const calls = mockFetch(() =>
    Promise.resolve(okCompletionResponse('{"statsOcr": [{"label": "幸运", "value": 25}]}')),
  );
  const res = await callHandler({
    body: jsonBody({
      imageDataUrl: VALID_PNG,
      selectedCharacter: { id: "ranger", name: "EVIL <script>" },
      cropped: true,
    }),
  });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.model, "test-model");
  assert.deepEqual(res.body.parsed, { statsOcr: [{ label: "幸运", value: 25 }] });
  assert.equal(calls.length, 1, "成功路径应调用一次上游");
  const sent = JSON.parse(calls[0].options.body);
  const promptText = sent.messages[0].content.find((part) => part.type === "text").text;
  assert.ok(promptText.includes("Ranger"), "提示词应使用服务端查到的角色名");
  assert.ok(!promptText.includes("EVIL"), "提示词不应包含客户端提供的角色文本");
  assert.ok(promptText.includes("已裁剪"), "裁剪标记应进入提示词");
  restoreFetch();
}

// ---------------------------------------------------------------------------
// 上游错误语义：生产不透传 detail，本地保留
// ---------------------------------------------------------------------------
{
  const upstreamErrorPayload = {
    error: { message: "SECRET-UPSTREAM-DETAIL should not leak", type: "invalid_request_error" },
  };
  mockFetch(() =>
    Promise.resolve({ ok: false, status: 400, json: async () => upstreamErrorPayload }),
  );

  setEnv(PRODUCTION_BASE);
  const prodRes = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(prodRes.statusCode, 502, "生产环境上游失败应映射为 502");
  assert.equal(prodRes.body.code, "UPSTREAM_ERROR");
  const prodJson = JSON.stringify(prodRes.body);
  assert.ok(!prodJson.includes("SECRET-UPSTREAM-DETAIL"), "生产环境不应透传上游 detail");

  setEnv({ API_KEY: "test-key", API_URL: "http://model.example/v1", MODEL: "test-model" });
  const localRes = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(localRes.statusCode, 400, "本地环境保留上游状态码便于调试");
  assert.equal(localRes.body.detail.error.message, "SECRET-UPSTREAM-DETAIL should not leak");
  restoreFetch();
  setEnv(PRODUCTION_BASE);
}

// ---------------------------------------------------------------------------
// 上游非 JSON 响应
// ---------------------------------------------------------------------------
{
  const calls = mockFetch(() =>
    Promise.resolve({ ok: true, status: 200, json: async () => { throw new Error("not json"); } }),
  );
  const res = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.text, "");
  assert.equal(res.body.parsed, null);
  assert.equal(calls.length, 1);
  restoreFetch();
}

// ---------------------------------------------------------------------------
// 上游超时
// ---------------------------------------------------------------------------
{
  const abortError = new Error("aborted");
  abortError.name = "AbortError";
  const calls = mockFetch(() => Promise.reject(abortError));
  const res = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(res.statusCode, 504);
  assert.equal(res.body.code, "UPSTREAM_TIMEOUT");
  assert.equal(calls.length, 1);
  restoreFetch();
}

// ---------------------------------------------------------------------------
// 上游不可达
// ---------------------------------------------------------------------------
{
  setEnv(PRODUCTION_BASE);
  const calls = mockFetch(() => Promise.reject(new Error("ECONNREFUSED")));
  const res = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(res.statusCode, 502);
  assert.equal(res.body.code, "UPSTREAM_UNREACHABLE");
  assert.ok(!JSON.stringify(res.body).includes("ECONNREFUSED"), "生产环境不透传内部错误细节");
  assert.equal(calls.length, 1);
  restoreFetch();
}

// ---------------------------------------------------------------------------
// 限流：窗口内超限返回 429 且不调用上游
// ---------------------------------------------------------------------------
{
  const { resetOcrRateLimitState } = await import("../src/ocrService.js");
  setEnv({ ...PRODUCTION_BASE, OCR_MAX_REQUESTS_PER_MINUTE: "2", OCR_MAX_CONCURRENCY: "5" });
  resetOcrRateLimitState();

  const calls = mockFetch(() => Promise.resolve(okCompletionResponse("{}")));
  const first = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  const second = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  const third = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 200);
  assert.equal(third.statusCode, 429, "窗口内第三次请求应被限流");
  assert.equal(third.body.code, "RATE_LIMITED");
  assert.equal(calls.length, 2, "被限流的请求不应调用上游模型");
  restoreFetch();
}

// ---------------------------------------------------------------------------
// 并发上限
// ---------------------------------------------------------------------------
{
  const { resetOcrRateLimitState } = await import("../src/ocrService.js");
  setEnv({ ...PRODUCTION_BASE, OCR_MAX_REQUESTS_PER_MINUTE: "100", OCR_MAX_CONCURRENCY: "1" });
  resetOcrRateLimitState();

  let releaseFetch;
  const calls = mockFetch(
    () =>
      new Promise((resolve) => {
        releaseFetch = () => resolve(okCompletionResponse("{}"));
      }),
  );
  const first = callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  const second = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(second.statusCode, 429, "并发上限内第二个请求应被拒绝");
  assert.equal(second.body.code, "RATE_LIMITED");
  const firstResponse = await first;
  assert.equal(firstResponse.statusCode, null, "第一个请求仍在途");
  releaseFetch();
  await new Promise((resolve) => setTimeout(resolve, 20));
  assert.equal(firstResponse.statusCode, 200);
  assert.equal(calls.length, 1, "被并发限制拒绝的请求不应调用上游模型");
  restoreFetch();
}

// ---------------------------------------------------------------------------
// 每日额度
// ---------------------------------------------------------------------------
{
  const { resetOcrRateLimitState } = await import("../src/ocrService.js");
  setEnv({ ...PRODUCTION_BASE, OCR_MAX_REQUESTS_PER_MINUTE: "100", OCR_DAILY_QUOTA: "1" });
  resetOcrRateLimitState();

  const calls = mockFetch(() => Promise.resolve(okCompletionResponse("{}")));
  const first = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  const second = await callHandler({ body: jsonBody({ imageDataUrl: VALID_PNG }) });
  assert.equal(first.statusCode, 200);
  assert.equal(second.statusCode, 429);
  assert.equal(second.body.code, "QUOTA_EXCEEDED");
  assert.equal(calls.length, 1, "超额度请求不应调用上游模型");
  restoreFetch();
}

restoreEnv();
restoreFetch();
console.log("API contract tests passed");