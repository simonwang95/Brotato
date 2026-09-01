// P1-4 / P1-8：构建产物校验（portable，不依赖本机游戏安装包）。
//
// 构建产物现在使用内容哈希文件名（JS/CSS/数据 JSON/图片），并生成
// data/manifest.json（逻辑名 -> 哈希路径）。本脚本在 `npm run build`
// 之后校验：
//   1) 构建产物存在且非空（index.html / 哈希 CSS / 浏览器 JS / 哈希数据 / manifest）。
//   2) 全部 JSON 数据文件可解析，且具备预期的顶层结构。
//   3) 数据中的全部图片引用都能在构建产物中解析到真实文件。
//   4) 构建后 app.js 里的 fetch 数据路径与相对模块引用都能解析到真实文件。
//   5) 产物体积不超过预算（防止静默膨胀）。
//
// 任一校验失败即以非零退出码结束，作为 CI 与发布前的门禁。

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(rootDir, "public");

let failures = 0;
let checks = 0;
function pass(message) {
  checks += 1;
  console.log(`  ✓ ${message}`);
}
function fail(message) {
  checks += 1;
  failures += 1;
  console.error(`  ✗ ${message}`);
}

function section(title) {
  console.log(`\n${title}`);
}

if (!existsSync(publicDir)) {
  console.error("\n[verify:build] 未找到 public/ 构建产物。请先运行 `npm run build`。");
  process.exit(1);
}

// 读取 manifest（逻辑名 -> 哈希路径），用于定位哈希后的数据文件。
const manifestPath = join(publicDir, "data", "manifest.json");
let manifest = { files: {} };
try {
  manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
} catch {
  // 下面会报告 manifest 缺失。
}

// 内容哈希文件名模式：<base>.<10 位十六进制>.<ext>
const HASH_RE = /\.[a-f0-9]{10}\./;

// --- 1) 构建产物存在且非空 ---
section("1) 构建产物存在且非空");
function checkFile(rel, label) {
  const abs = join(publicDir, rel);
  if (!existsSync(abs)) {
    fail(`缺少构建产物：${label ?? rel}`);
    return;
  }
  const size = statSync(abs).size;
  if (size === 0) fail(`构建产物为空：${label ?? rel}`);
  else pass(`${label ?? rel}（${size} 字节）`);
}
checkFile("index.html");
// 哈希 CSS：按模式匹配
const cssFiles = readdirSync(publicDir).filter((f) => f.endsWith(".css") && HASH_RE.test(f));
if (cssFiles.length === 0) fail("缺少哈希 CSS 产物");
else cssFiles.forEach((f) => checkFile(f));
// 版本化 JS 目录：/src/v<version>/ 下保持稳定文件名
const srcDir = join(publicDir, "src");
const versionDirs = existsSync(srcDir)
  ? readdirSync(srcDir, { withFileTypes: true }).filter((d) => d.isDirectory() && d.name.startsWith("v")).map((d) => d.name)
  : [];
if (versionDirs.length === 0) {
  fail("缺少版本化 JS 目录（src/v<version>/）");
} else {
  const jsDir = join(srcDir, versionDirs[0]);
  const jsFiles = readdirSync(jsDir).filter((f) => f.endsWith(".js"));
  if (jsFiles.length < 12) fail(`浏览器 JS 产物不足（${jsFiles.length}/12）`);
  else jsFiles.forEach((f) => checkFile(join("src", versionDirs[0], f), `src/${versionDirs[0]}/${f}`));
}
// 哈希数据文件（来自 manifest）
for (const [logical, hashedRel] of Object.entries(manifest.files)) {
  checkFile(hashedRel, `data/${logical} -> ${hashedRel.split("/").pop()}`);
}
checkFile("data/manifest.json");

// --- 2) JSON 数据文件可解析且具备预期顶层结构 ---
section("2) JSON 数据文件结构");
const EXPECTED_JSON = {
  "official-catalog.json": ["sourceMetadata", "packages", "summary", "records"],
  "official-localization.json": ["sourceMetadata", "packages", "summary", "entries"],
  "official-unlocks.json": [
    "sourceMetadata",
    "generatedFrom",
    "note",
    "summary",
    "records",
  ],
  "official-effect-decoding.json": [
    "generatedFrom",
    "sourceMetadata",
    "note",
    "summary",
    "records",
  ],
  "official-character-catalog-gaps.json": ["summary", "records"],
  "official-unlock-pending.json": ["generatedFrom", "note", "summary", "records"],
};
for (const [file, expectedKeys] of Object.entries(EXPECTED_JSON)) {
  // 哈希数据文件从 manifest 定位；稳定数据文件用原名。
  const rel = manifest.files[file] ?? `data/${file}`;
  const abs = join(publicDir, rel);
  if (!existsSync(abs)) {
    fail(`缺少数据文件：${rel}`);
    continue;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8"));
  } catch (error) {
    fail(`${rel} 无法解析为 JSON：${error.message}`);
    continue;
  }
  const missingKeys = expectedKeys.filter((key) => !(key in parsed));
  if (missingKeys.length) fail(`${rel} 缺少顶层字段：${missingKeys.join(", ")}`);
  else pass(`${rel} 结构完整`);
}

// --- 3) 数据中的图片引用都能解析到真实文件 ---
section("3) 图片引用解析");
const IMAGE_EXT = /\.(?:png|webp|jpe?g|gif)$/i;
let imageRefs = 0;
let imageMissing = 0;
const dataDir = join(publicDir, "data");
function collectAssetRefs(value, found) {
  if (typeof value === "string") {
    if (value.startsWith("res://")) return; // 跳过 Godot 源路径元数据。
    if (IMAGE_EXT.test(value)) found.add(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => collectAssetRefs(item, found));
  } else if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectAssetRefs(item, found));
  }
}
for (const file of readdirSync(dataDir)) {
  if (!file.endsWith(".json") || file === "manifest.json") continue;
  const parsed = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
  const refs = new Set();
  collectAssetRefs(parsed, refs);
  for (const ref of refs) {
    imageRefs += 1;
    const candidates = [
      join(publicDir, ref),
      join(publicDir, "data", ref.replace(/^data\//, "")),
    ];
    if (!candidates.some((candidate) => existsSync(candidate))) {
      imageMissing += 1;
      if (imageMissing <= 20) fail(`图片引用无法解析：${ref}`);
    }
  }
}
if (imageMissing === 0) pass(`全部 ${imageRefs} 条资产图片引用均可解析`);
else fail(`${imageRefs} 条资产图片引用中有 ${imageMissing} 条无法解析`);

// --- 4) 构建后 app.js 的 fetch 数据路径与相对模块引用可解析 ---
section("4) 模块 / fetch 路径解析");
const appJsAbs = versionDirs.length ? join(srcDir, versionDirs[0], "app.js") : null;
if (!appJsAbs || !existsSync(appJsAbs)) {
  fail("缺少构建后的 app.js（无法校验 fetch / import 路径）");
} else {
  const appJs = readFileSync(appJsAbs, "utf8");
  const fetchPaths = [...appJs.matchAll(/fetch\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
  const importSpecs = [...appJs.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]);
  let pathMissing = 0;
  for (const path of new Set(fetchPaths)) {
    if (path.startsWith("/api/")) continue; // 可选 API，线上默认关闭，不作为硬门禁。
    // 绝对路径（/data/...）相对站点根；相对路径（./...）相对 app.js 所在目录。
    const resolved = path.startsWith("/")
      ? join(publicDir, path)
      : join(srcDir, versionDirs[0], path.replace(/^\.\//, ""));
    if (!existsSync(resolved)) {
      pathMissing += 1;
      fail(`fetch 路径无法解析：${path}`);
    }
  }
  for (const spec of new Set(importSpecs)) {
    const resolved = join(srcDir, versionDirs[0], spec.replace(/^\.\//, ""));
    if (!existsSync(resolved)) {
      pathMissing += 1;
      fail(`模块引用无法解析：${spec}`);
    }
  }
  if (pathMissing === 0) {
    pass(`全部 ${new Set(fetchPaths).size} 个 fetch 路径与 ${new Set(importSpecs).size} 个模块引用均可解析`);
  }
}

// --- 5) 产物体积预算 ---
section("5) 产物体积预算");
function dirSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(abs) : statSync(abs).size;
  }
  return total;
}
const publicSize = dirSize(publicDir);
const BUDGET_BYTES = 12 * 1024 * 1024; // 12 MiB
if (publicSize > BUDGET_BYTES) {
  fail(`public/ 体积 ${(publicSize / 1048576).toFixed(1)} MiB 超出预算 ${(BUDGET_BYTES / 1048576).toFixed(0)} MiB`);
} else {
  pass(`public/ 总体积 ${(publicSize / 1048576).toFixed(1)} MiB（预算 ${(BUDGET_BYTES / 1048576).toFixed(0)} MiB）`);
}

// --- 汇总 ---
console.log(`\n[verify:build] ${checks} 项检查，${failures} 项失败。`);
if (failures > 0) {
  console.error("[verify:build] 构建校验未通过。");
  process.exit(1);
}
console.log("[verify:build] 构建校验通过。");