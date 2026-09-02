// P1-4 / R3：发布后健康检查（适配 P1-8 哈希化构建）。
//
// 对已部署（或本地静态服务）的站点做发布后体检。P1-8 之后资源路径带内容哈希：
//   - CSS：/styles.<hash>.css（index.html 内联引用）
//   - JS：/src/v<appVersion>/<module>.js（版本目录 + 稳定文件名）
//   - JSON 数据：/data/<name>.<hash>.json（manifest.json 映射逻辑名 → 哈希路径）
//   - 图片：/data/assets/**.<hash>.webp（catalog 记录 imageAssetPath）
//
// 本脚本不再硬编码旧路径，而是：
//   1. 解析 index.html 中实际的 CSS / 入口脚本路径；
//   2. 读取 /data/manifest.json 获取数据文件的哈希路径；
//   3. 从 catalog JSON 采样若干哈希化图片路径；
//   4. 可选 API（/api/parse-screenshot）：线上默认关闭，允许契约合法的 503（OCR_DISABLED），
//      但其它 5xx 仍判失败。
//
// 用法：
//   node scripts/health-check.mjs --base https://your-site.vercel.app
//   node scripts/health-check.mjs --base http://127.0.0.1:5174   （先 npm run build）
//
// 任一关键资源失败即以非零退出码结束，可作为发布后门禁。

import { fileURLToPath } from "node:url";

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

// 抓取一个路径，返回 { status, text }；失败抛错。
async function fetchPath(path) {
  const response = await fetch(`${base}${path}`, { headers: { accept: "*/*" } });
  const text = await response.text().catch(() => "");
  return { status: response.status, text };
}

// 检查一个资源：200 且（可选）合法 JSON / 含关键内容 / 非空。
async function check(label, path, { expectJson = false, expectContent = null } = {}) {
  checks += 1;
  let result;
  try {
    result = await fetchPath(path);
  } catch (error) {
    failures += 1;
    console.error(`  ✗ ${label}：请求失败（${error.message}）`);
    return;
  }
  const { status, text } = result;
  if (status !== 200) {
    failures += 1;
    console.error(`  ✗ ${label}：HTTP ${status}（${path}）`);
    return;
  }
  if (expectJson) {
    try {
      JSON.parse(text);
    } catch {
      failures += 1;
      console.error(`  ✗ ${label}：HTTP 200 但响应不是合法 JSON`);
      return;
    }
  }
  if (expectContent && !text.includes(expectContent)) {
    failures += 1;
    console.error(`  ✗ ${label}：HTTP 200 但缺少关键内容 “${expectContent}”`);
    return;
  }
  if (text.length === 0) {
    failures += 1;
    console.error(`  ✗ ${label}：HTTP 200 但响应为空`);
    return;
  }
  console.log(`  ✓ ${label}（HTTP 200，${text.length} 字节）`);
}

console.log(`[health-check] 目标：${base}\n`);

// 1) 首页：200 且含关键内容；同时解析出 CSS / 入口脚本路径。
// F2：任何非 200 状态（包括 404 + 合法正文）都必须计入失败。
// 旧实现只打印不计数，且继续解析错误响应正文中的引用，导致假绿（exit 0）。
console.log("首页 / 样式 / 入口脚本");
let indexText = "";
let indexStatus = 0;
let indexChecked = false;
try {
  const r = await fetchPath("/index.html");
  indexStatus = r.status;
  indexText = r.text;
} catch (error) {
  checks += 1;
  failures += 1;
  indexChecked = true;
  console.error(`  ✗ 首页：请求失败（${error.message}）`);
}
if (!indexChecked) {
  checks += 1;
  if (indexStatus === 200 && indexText.includes("Brotato")) {
    console.log(`  ✓ 首页（HTTP 200，${indexText.length} 字节）`);
  } else if (indexStatus === 200) {
    failures += 1;
    console.error(`  ✗ 首页：HTTP 200 但缺少关键内容 “Brotato”`);
  } else {
    failures += 1;
    console.error(`  ✗ 首页：HTTP ${indexStatus}（非 200 一律判失败，与正文内容无关）`);
  }
}

// 从 index.html 解析 CSS 与入口脚本路径（哈希化）。
// F2：仅在首页 200 时解析引用；非 200 时根因已判失败，
// 不再基于错误响应正文做后续资源检查（避免误导性输出）。
const indexOk = indexStatus === 200;
const cssMatch = indexOk ? /href="([^"]+\.css)"/.exec(indexText) : null;
const scriptMatch = indexOk ? /src="([^"]+\.js)"/.exec(indexText) : null;
const cssPath = cssMatch ? cssMatch[1].replace(/^\.\//, "/") : null;
const scriptPath = scriptMatch ? scriptMatch[1].replace(/^\.\//, "/") : null;

if (cssPath) await check("样式表", cssPath);
else {
  checks += 1;
  failures += 1;
  console.error("  ✗ 样式表：index.html 未解析出 CSS 路径");
}
if (scriptPath) await check("入口脚本", scriptPath);
else {
  checks += 1;
  failures += 1;
  console.error("  ✗ 入口脚本：index.html 未解析出入口脚本路径");
}

// 2) 版本化 JS 目录：从入口脚本路径推导（/src/v<hash>/），检查各模块。
console.log("\n核心 JS 模块（版本目录）");
const jsDirMatch = /^(\/src\/v[^/]+)\//.exec(scriptPath ?? "");
const jsDir = jsDirMatch ? jsDirMatch[1] : null;
const JS_MODULES = [
  "app", "calculator", "fieldSchema", "scenarioCalculator", "strategyGenerator",
  "compendium", "strategyData", "scenarioData", "officialCatalog", "officialUnlocks",
  "renderUtils", "imageValidation", "weaponImport",
];
if (jsDir) {
  for (const module of JS_MODULES) {
    await check(`模块 ${module}.js`, `${jsDir}/${module}.js`);
  }
} else {
  checks += 1;
  failures += 1;
  console.error("  ✗ JS 模块：无法从入口脚本推导版本目录（/src/v<hash>/）");
}

// 3) JSON 数据：读取 manifest.json 获取哈希路径。
console.log("\nJSON 数据（manifest 映射）");
let manifest = null;
try {
  const r = await fetchPath("/data/manifest.json");
  if (r.status === 200) manifest = JSON.parse(r.text);
} catch {
  // 忽略，下面统一判失败
}
checks += 1;
if (manifest && manifest.files) {
  console.log(`  ✓ manifest.json（version ${manifest.version}，${Object.keys(manifest.files).length} 个文件）`);
  for (const [logical, hashed] of Object.entries(manifest.files)) {
    // manifest.files 的值形如 "data/official-catalog.<hash>.json"，直接加前导斜杠。
    await check(`数据 ${logical}`, `/${hashed}`, { expectJson: true });
  }
} else {
  failures += 1;
  console.error("  ✗ manifest.json：不可达或不是合法 JSON");
}

// 4) WebP 图片：从 catalog JSON 采样若干哈希化图片路径。
console.log("\nWebP 图片（catalog 采样）");
let catalogData = null;
if (manifest?.files?.["official-catalog.json"]) {
  try {
    const r = await fetchPath(`/${manifest.files["official-catalog.json"]}`);
    if (r.status === 200) catalogData = JSON.parse(r.text);
  } catch {
    // 忽略
  }
}
if (catalogData?.records) {
  // 采样：角色 / 武器 / 道具 各取一张（去重，最多 6 张）。
  const seen = new Set();
  const samples = [];
  for (const kind of ["character", "weapon", "item"]) {
    for (const rec of catalogData.records) {
      if (rec.kind !== kind || !rec.imageAssetPath) continue;
      if (seen.has(rec.imageAssetPath)) continue;
      seen.add(rec.imageAssetPath);
      samples.push(rec.imageAssetPath);
      break; // 每种类型取第一张
    }
  }
  // 再补充到 6 张（跨类型）。
  for (const rec of catalogData.records) {
    if (samples.length >= 6) break;
    if (!rec.imageAssetPath || seen.has(rec.imageAssetPath)) continue;
    seen.add(rec.imageAssetPath);
    samples.push(rec.imageAssetPath);
  }
  for (const image of samples) {
    await check(`图片 ${image.split("/").pop()}`, `/${image}`);
  }
} else {
  checks += 1;
  failures += 1;
  console.error("  ✗ 图片采样：catalog JSON 不可达，无法采样哈希化图片");
}

// 5) 可选 API：线上默认关闭，允许契约合法的 503（OCR_DISABLED）。
// F6：200 分支必须要求 JSON 解析成功 + enabled 布尔 + mode ∈ {local, production}；
// 503 分支必须要求 JSON 解析成功 + 稳定错误码 code === "OCR_DISABLED"。
// 旧实现把任何 HTTP 200（含 200 text/plain "not-json"）都判为契约合法，导致假绿。
if (includeApi) {
  console.log("\n可选 API（线上默认关闭）");
  checks += 1;
  try {
    const r = await fetchPath("/api/parse-screenshot");
    const { status, text } = r;
    let body = null;
    try {
      const parsed = JSON.parse(text);
      if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
        body = parsed;
      }
    } catch {
      // 非 JSON
    }
    const status200Valid =
      status === 200 &&
      body !== null &&
      typeof body.enabled === "boolean" &&
      (body.mode === "local" || body.mode === "production");
    const status503Valid = status === 503 && body !== null && body.code === "OCR_DISABLED";
    if (status200Valid) {
      console.log(`  ✓ OCR API（HTTP 200，enabled=${body.enabled}，mode=${body.mode}）`);
    } else if (status503Valid) {
      console.log(`  ✓ OCR API（HTTP 503 OCR_DISABLED，契约合法：线上默认关闭）`);
    } else if (status === 404) {
      // 404：API 未部署（本地静态服务无 API），视为可选跳过。
      console.log(`  ~ OCR API（HTTP 404，API 未部署，跳过）`);
    } else {
      failures += 1;
      console.error(
        `  ✗ OCR API：HTTP ${status} 不符合契约（200 需 JSON 状态对象：enabled 布尔 + mode local|production；503 需 code=OCR_DISABLED）`,
      );
    }
  } catch (error) {
    console.log(`  ~ OCR API（不可达：${error.message}，跳过）`);
  }
}

console.log(`\n[health-check] ${checks} 项检查，${failures} 项失败。`);
if (failures > 0) {
  console.error("[health-check] 发布后健康检查未通过。");
  process.exit(1);
}
console.log("[health-check] 发布后健康检查通过。");