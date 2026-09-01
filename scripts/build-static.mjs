import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { dirname, extname, join } from "node:path";

const outputDir = "public";

// 需要内容哈希 + manifest 的运行时数据文件（页面 fetch 的 4 个）
const DATA_FILES = [
  "official-catalog.json",
  "official-localization.json",
  "official-unlocks.json",
  "official-effect-decoding.json",
];
// 浏览器可达的 src 模块（排除服务端专用的 ocrService.js，避免泄漏到公开目录）
const BROWSER_SRC_FILES = [
  "app.js",
  "calculator.js",
  "compendium.js",
  "fieldSchema.js",
  "imageValidation.js",
  "officialCatalog.js",
  "officialUnlocks.js",
  "renderUtils.js",
  "scenarioCalculator.js",
  "scenarioData.js",
  "strategyData.js",
  "strategyGenerator.js",
];
// 体积预算（字节）：超过则告警，total 硬上限则失败
const BUDGET = {
  js: 500 * 1024,
  css: 200 * 1024,
  json: 2500 * 1024,
  image: 6 * 1024 * 1024,
  total: 10 * 1024 * 1024,
};

function shortHash(content) {
  return createHash("sha256").update(content).digest("hex").slice(0, 10);
}

function sizeOf(file) {
  try {
    return statSync(file).size;
  } catch {
    return 0;
  }
}

// 1. 清理并创建输出目录
rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

const report = { js: 0, css: 0, json: 0, image: 0, files: 0 };
function account(file, type) {
  const size = sizeOf(file);
  report[type] += size;
  report.files += 1;
}

// 2. 入口 HTML（稳定名，no-cache 保证更新及时生效）
copyFileSync("index.html", join(outputDir, "index.html"));

// 3. CSS：内容哈希（单文件，无 import，直接哈希文件名）
const cssContent = readFileSync("styles.css");
const cssHashed = `styles.${shortHash(cssContent)}.css`;
writeFileSync(join(outputDir, cssHashed), cssContent);
account(join(outputDir, cssHashed), "css");

// 4. JS：整体版本化目录。所有浏览器模块保持稳定文件名，放在 /src/v<version>/ 下；
//    任一模块源码变化都会改变 version，从而整体换 URL（避免旧 immutable 缓存阻塞），
//    且模块间相对 import（./calculator.js）无需改写、无循环依赖。
const jsSources = BROWSER_SRC_FILES.map((file) => readFileSync(join("src", file)));
const appVersion = shortHash(Buffer.concat(jsSources));
const jsDir = join(outputDir, "src", `v${appVersion}`);
mkdirSync(jsDir, { recursive: true });
for (const file of BROWSER_SRC_FILES) {
  copyFileSync(join("src", file), join(jsDir, file));
  account(join(jsDir, file), "js");
}

// 6. 内容哈希图片，建立 原路径 -> 哈希路径 映射
const imageMap = {};
const assetsRoot = "data/assets";
if (existsSync(assetsRoot)) {
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      const content = readFileSync(full);
      const ext = extname(full);
      const hashedFull = join(dirname(full), `${entry.name.replace(ext, "")}.${shortHash(content)}${ext}`);
      const rel = full.replace(/\\/g, "/");
      const hashedRel = hashedFull.replace(/\\/g, "/");
      imageMap[rel] = hashedRel;
      mkdirSync(join(outputDir, dirname(hashedRel)), { recursive: true });
      writeFileSync(join(outputDir, hashedRel), content);
      account(join(outputDir, hashedRel), "image");
    }
  };
  walk(assetsRoot);
}

// 7. 改写 index.html：CSS / 入口 JS / 硬编码图片引用 -> 哈希名
let html = readFileSync("index.html", "utf8");
html = html.split("styles.css").join(cssHashed);
html = html.split("./src/app.js").join(`./src/v${appVersion}/app.js`);
for (const [orig, hashed] of Object.entries(imageMap)) {
  html = html.split(`./${orig}`).join(`./${hashed}`);
  html = html.split(`"${orig}"`).join(`"${hashed}"`);
}
writeFileSync(join(outputDir, "index.html"), html);

// 8. 数据 JSON：把图片引用替换为哈希路径，再内容哈希；生成 manifest
const dataOut = join(outputDir, "data");
mkdirSync(dataOut, { recursive: true });
const manifest = { version: "", files: {} };
for (const name of DATA_FILES) {
  let content = readFileSync(join("data", name), "utf8");
  for (const [orig, hashed] of Object.entries(imageMap)) {
    content = content.split(`"${orig}"`).join(`"${hashed}"`);
  }
  const hash = shortHash(content);
  const hashedName = name.replace(".json", `.${hash}.json`);
  writeFileSync(join(dataOut, hashedName), content);
  manifest.files[name] = `data/${hashedName}`;
  account(join(dataOut, hashedName), "json");
}
// 其余 data JSON（gaps/pending 等，不常变）保持原名复制
for (const entry of readdirSync("data")) {
  if (entry.endsWith(".json") && !DATA_FILES.includes(entry)) {
    copyFileSync(join("data", entry), join(dataOut, entry));
    account(join(dataOut, entry), "json");
  }
}
manifest.version = shortHash(Object.values(manifest.files).join("|"));
writeFileSync(join(dataOut, "manifest.json"), JSON.stringify(manifest, null, 2));
account(join(dataOut, "manifest.json"), "json");

// 8. 体积预算报告
report.total = report.js + report.css + report.json + report.image;
const fmt = (bytes) => `${(bytes / 1024).toFixed(1)} KB`;
console.log("\n[build] 体积预算报告：");
for (const type of ["js", "css", "json", "image", "total"]) {
  const value = report[type];
  const budget = BUDGET[type];
  const over = value > budget;
  console.log(
    `  ${type.padEnd(6)} ${fmt(value).padStart(10)}  / 预算 ${fmt(budget)}${over ? "  ⚠ 超预算" : ""}`,
  );
}
console.log(
  `  文件数 ${report.files}（图片 ${Object.keys(imageMap).length} 张，数据 ${DATA_FILES.length} 个哈希 + manifest，JS 版本 v${appVersion}）`,
);
if (report.total > BUDGET.total) {
  console.error(`[build] 失败：总体积 ${fmt(report.total)} 超过硬上限 ${fmt(BUDGET.total)}`);
  process.exit(1);
}
console.log(`[build] 构建完成 -> ${outputDir}/（manifest v${manifest.version}）`);