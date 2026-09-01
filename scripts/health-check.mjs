// P1-4：发布后健康检查。
//
// 对已部署（或本地静态服务）的站点做发布后体检：
//   - 首页：200 且含关键内容。
//   - JS 模块：200 且非空。
//   - JSON 数据：200 且可解析。
//   - WebP 图片：200 且非空。
//   - 可选 API（/api/parse-screenshot）：线上默认关闭，仅检查返回受控的 JSON（不要求 200）。
//
// 用法：
//   node scripts/health-check.mjs --base https://your-site.vercel.app
//   node scripts/health-check.mjs --base http://127.0.0.1:5174   （先 npm run build）
//
// 任一关键资源失败即以非零退出码结束，可作为发布后门禁。

import { existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

function parseArgs(argv) {
  const args = { base: null, includeApi: false };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--base") args.base = argv[i + 1];
    else if (token === "--api") args.includeApi = true;
  }
  return args;
}

const { base: rawBase, includeApi } = parseArgs(process.argv);
if (!rawBase) {
  console.error("用法：node scripts/health-check.mjs --base <https://site> [--api]");
  process.exit(1);
}
const base = rawBase.replace(/\/$/, "");

let failures = 0;
let checks = 0;
async function check(label, path, { expectJson = false, expectContent = null, optional = false } = {}) {
  checks += 1;
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      headers: { accept: expectJson ? "application/json" : "*/*" },
    });
  } catch (error) {
    if (optional) {
      console.log(`  ~ ${label}（可选，不可达：${error.message}）`);
      return;
    }
    failures += 1;
    console.error(`  ✗ ${label}：请求失败（${error.message}）`);
    return;
  }
  const status = response.status;
  const text = await response.text().catch(() => "");
  const okStatus = optional ? status < 500 : status === 200;
  if (!okStatus) {
    failures += 1;
    console.error(`  ✗ ${label}：HTTP ${status}`);
    return;
  }
  if (expectJson) {
    try {
      JSON.parse(text);
    } catch {
      failures += 1;
      console.error(`  ✗ ${label}：HTTP ${status} 但响应不是合法 JSON`);
      return;
    }
  }
  if (expectContent && !text.includes(expectContent)) {
    failures += 1;
    console.error(`  ✗ ${label}：HTTP ${status} 但缺少关键内容 “${expectContent}”`);
    return;
  }
  if (!optional && text.length === 0) {
    failures += 1;
    console.error(`  ✗ ${label}：HTTP ${status} 但响应为空`);
    return;
  }
  console.log(`  ✓ ${label}（HTTP ${status}${text ? `, ${text.length} 字节` : ""}）`);
}

console.log(`[health-check] 目标：${base}\n`);

console.log("首页 / 样式 / 入口脚本");
await check("首页", "/index.html", { expectContent: "Brotato" });
await check("样式表", "/styles.css");
await check("入口脚本", "/src/app.js");

console.log("\n核心 JS 模块");
for (const module of ["calculator", "fieldSchema", "scenarioCalculator", "strategyGenerator", "compendium", "strategyData", "scenarioData", "officialCatalog", "officialUnlocks", "renderUtils", "imageValidation"]) {
  await check(`模块 ${module}.js`, `/src/${module}.js`);
}

console.log("\nJSON 数据");
for (const file of ["official-catalog.json", "official-localization.json", "official-unlocks.json"]) {
  await check(`数据 ${file}`, `/data/${file}`, { expectJson: true });
}

console.log("\nWebP 图片（抽样）");
for (const image of [
  "characters/character_ranger.webp",
  "weapons/weapon_smg_1.webp",
  "items/item_acid.webp",
]) {
  await check(`图片 ${image}`, `/data/assets/${image}`);
}

if (includeApi) {
  console.log("\n可选 API（线上默认关闭）");
  await check("OCR API", "/api/parse-screenshot", { optional: true, expectJson: true });
}

console.log(`\n[health-check] ${checks} 项检查，${failures} 项失败。`);
if (failures > 0) {
  console.error("[health-check] 发布后健康检查未通过。");
  process.exit(1);
}
console.log("[health-check] 发布后健康检查通过。");