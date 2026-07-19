import assert from "node:assert/strict";
import { buildAiConfig } from "../src/ocrService.js";

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

console.log("OCR service tests passed");
