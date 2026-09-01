// P1-4：构建产物校验（portable，不依赖本机游戏安装包）。
//
// 在干净检出环境中运行 `npm run build` 之后，校验：
//   1) 构建产物存在且非空（index.html / styles.css / src / data）。
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

// --- 1) 构建产物存在且非空 ---
section("1) 构建产物存在且非空");
const requiredOutputs = [
  "index.html",
  "styles.css",
  "src/app.js",
  "src/calculator.js",
  "src/fieldSchema.js",
  "src/scenarioCalculator.js",
  "src/strategyGenerator.js",
  "src/compendium.js",
  "data/official-catalog.json",
  "data/official-localization.json",
  "data/official-unlocks.json",
];
for (const rel of requiredOutputs) {
  const abs = join(publicDir, rel);
  if (!existsSync(abs)) {
    fail(`缺少构建产物：${rel}`);
    continue;
  }
  const size = statSync(abs).size;
  if (size === 0) {
    fail(`构建产物为空：${rel}`);
  } else {
    pass(`${rel}（${size} 字节）`);
  }
}

if (!existsSync(publicDir)) {
  console.error(
    "\n[verify:build] 未找到 public/ 构建产物。请先运行 `npm run build`。",
  );
  process.exit(1);
}

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
  const abs = join(publicDir, "data", file);
  if (!existsSync(abs)) {
    fail(`缺少数据文件：data/${file}`);
    continue;
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(abs, "utf8"));
  } catch (error) {
    fail(`data/${file} 无法解析为 JSON：${error.message}`);
    continue;
  }
  const missingKeys = expectedKeys.filter((key) => !(key in parsed));
  if (missingKeys.length) {
    fail(`data/${file} 缺少顶层字段：${missingKeys.join(", ")}`);
  } else {
    pass(`data/${file} 结构完整`);
  }
}

// --- 3) 数据中的图片引用都能解析到真实文件 ---
// 只校验“抽取后的资产路径”（形如 data/assets/...）；
// Godot 源路径 res://... 是来源元数据，不参与解析校验。
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
  if (!file.endsWith(".json")) continue;
  const parsed = JSON.parse(readFileSync(join(dataDir, file), "utf8"));
  const refs = new Set();
  collectAssetRefs(parsed, refs);
  for (const ref of refs) {
    imageRefs += 1;
    // 资产路径形如 "data/assets/characters/x.webp"，构建后位于 public/ 下同名路径。
    const candidates = [
      join(publicDir, ref),
      join(publicDir, "data", ref.replace(/^data\//, "")),
    ];
    if (!candidates.some((candidate) => existsSync(candidate))) {
      imageMissing += 1;
      if (imageMissing <= 20) {
        fail(`图片引用无法解析：${ref}`);
      }
    }
  }
}
if (imageMissing === 0) {
  pass(`全部 ${imageRefs} 条资产图片引用均可解析`);
} else {
  fail(`${imageRefs} 条资产图片引用中有 ${imageMissing} 条无法解析`);
}

// --- 4) 构建后 app.js 的 fetch 数据路径与相对模块引用可解析 ---
section("4) 模块 / fetch 路径解析");
const appJs = readFileSync(join(publicDir, "src", "app.js"), "utf8");
const fetchPaths = [...appJs.matchAll(/fetch\(\s*["']([^"']+)["']/g)].map((m) => m[1]);
const importSpecs = [...appJs.matchAll(/from\s+["'](\.[^"']+)["']/g)].map((m) => m[1]);
let pathMissing = 0;
for (const path of new Set(fetchPaths)) {
  if (path.startsWith("/api/")) continue; // 可选 API，线上默认关闭，不作为硬门禁。
  const resolved = join(publicDir, path.replace(/^\.\//, ""));
  if (!existsSync(resolved)) {
    pathMissing += 1;
    fail(`fetch 路径无法解析：${path}`);
  }
}
for (const spec of new Set(importSpecs)) {
  const resolved = join(publicDir, "src", `${spec}`);
  if (!existsSync(resolved)) {
    pathMissing += 1;
    fail(`模块引用无法解析：${spec}`);
  }
}
if (pathMissing === 0) {
  pass(`全部 ${new Set(fetchPaths).size} 个 fetch 路径与 ${new Set(importSpecs).size} 个模块引用均可解析`);
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