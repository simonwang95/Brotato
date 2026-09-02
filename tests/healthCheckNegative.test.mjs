// R3 / F1 / F2 / F6 负例：验证 health-check 对缺失哈希资源 / 坏 manifest /
// 非 200 首页 / 非契约 API 响应稳定失败（不 fail-open）。
// 通过子进程运行 scripts/health-check.mjs 并断言退出码。全部用 node http 服务（避免 python 进程残留）。
//
// F1：本测试不再复制未跟踪的构建产物 public/（.gitignore 排除，干净检出中不存在，
// 而 CI 在 npm run build 之前运行 npm test，旧实现会在干净 CI 中 ENOENT 崩溃）。
// 改为在临时目录构造最小、确定性的静态产物（index.html + 哈希化 CSS/JS +
// manifest + 数据 JSON + 图片桩），使 npm test 完全自包含、可在干净检出运行。
import { execFile } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const scriptPath = join(rootDir, "scripts", "health-check.mjs");

// 与 scripts/health-check.mjs 的 JS_MODULES 列表一致（P1-8 版本目录模块）。
const JS_MODULES = [
  "app", "calculator", "fieldSchema", "scenarioCalculator", "strategyGenerator",
  "compendium", "strategyData", "scenarioData", "officialCatalog", "officialUnlocks",
  "renderUtils", "imageValidation", "weaponImport",
];

// F1：固定假哈希保证最小产物确定、可复现。
const FAKE = {
  css: "styles.aaaaaaaaaa.css",
  jsDir: "src/vbbbbbbbbbb",
  data: {
    "official-catalog.json": "data/official-catalog.cccccccccc.json",
    "official-localization.json": "data/official-localization.dddddddddd.json",
    "official-unlocks.json": "data/official-unlocks.eeeeeeeeee.json",
    "effect-decoding.json": "data/effect-decoding.ffffffffff.json",
  },
};

// F1：构造最小、确定性的静态产物（结构与 scripts/build-static.mjs 的构建输出同构：
// index.html 内联引用哈希 CSS + 版本目录入口脚本；manifest 映射逻辑名 → 哈希数据路径；
// catalog 记录带 imageAssetPath 供图片采样）。
function buildMinimalArtifact(pub) {
  writeFileSync(
    join(pub, "index.html"),
    `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <title>Brotato 策略助手</title>
  <link rel="stylesheet" href="./${FAKE.css}">
</head>
<body>
  <h1>Brotato 策略助手</h1>
  <script type="module" src="./${FAKE.jsDir}/app.js"></script>
</body>
</html>
`,
  );
  writeFileSync(join(pub, FAKE.css), "body { margin: 0; }\n");
  const jsDir = join(pub, FAKE.jsDir);
  mkdirSync(jsDir, { recursive: true });
  for (const module of JS_MODULES) {
    writeFileSync(join(jsDir, `${module}.js`), `export const NAME = "${module}";\n`);
  }
  mkdirSync(join(pub, "data"), { recursive: true });
  writeFileSync(join(pub, "data", "manifest.json"), JSON.stringify({ version: "test", files: FAKE.data }, null, 2));
  // catalog：每类 2 条记录（共 6 条），各带不同 imageAssetPath，覆盖 health-check 的图片采样。
  const records = [];
  for (const kind of ["character", "weapon", "item"]) {
    for (let i = 1; i <= 2; i += 1) {
      records.push({
        kind,
        nameKey: `${kind.toUpperCase()}_TEST${i}`,
        imageAssetPath: `data/assets/${kind}_test${i}.11111111${i}.webp`,
        stats: { damage: 10, cooldown: 60 },
      });
    }
  }
  for (const [logical, hashed] of Object.entries(FAKE.data)) {
    const content =
      logical === "official-catalog.json"
        ? JSON.stringify({ version: "test", records })
        : JSON.stringify({ version: "test", entries: {} });
    writeFileSync(join(pub, hashed), content);
  }
  // 图片桩：health-check 只校验 200 + 非空。
  for (const rec of records) {
    mkdirSync(join(pub, "data", "assets"), { recursive: true });
    writeFileSync(join(pub, rec.imageAssetPath), "stub-webp-bytes\n");
  }
}

// 起一个静态服务（node http），返回指定目录；
// apiBehavior 用于 /api/parse-screenshot；overrides 用于按 URL 覆盖状态码/正文（F2 负例）。
function startServer(dir, port, { apiBehavior = null, overrides = {} } = {}) {
  const server = createServer((req, res) => {
    if (apiBehavior && req.url === "/api/parse-screenshot") {
      const { status, body, json } = apiBehavior;
      res.writeHead(status, { "content-type": json ? "application/json" : "text/plain" });
      res.end(body);
      return;
    }
    if (overrides[req.url]) {
      const { status, body } = overrides[req.url];
      res.writeHead(status);
      res.end(body);
      return;
    }
    const file = join(dir, req.url === "/" ? "index.html" : req.url);
    if (!existsSync(file) || !file.startsWith(dir)) {
      res.writeHead(404);
      res.end("not found");
      return;
    }
    res.writeHead(200);
    res.end(readFileSync(file));
  });
  return new Promise((resolve) => {
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

function runHealthCheck(base, extraArgs = []) {
  return new Promise((resolve) => {
    execFile("node", [scriptPath, "--base", base, ...extraArgs], { timeout: 30000 }, (error, stdout, stderr) => {
      if (!error) resolve({ code: 0, output: "" });
      else resolve({ code: error.killed ? 124 : (error.code ?? 1), output: `${stdout ?? ""}${stderr ?? ""}` });
    });
  });
}

let failures = 0;
function expectFail(name, result) {
  if (result.code !== 0) console.log(`  ✓ ${name}（退出码 ${result.code}，如预期失败）`);
  else {
    failures += 1;
    console.error(`  ✗ ${name}：应失败但退出码 0（fail-open）`);
  }
}
function expectPass(name, result) {
  if (result.code === 0) console.log(`  ✓ ${name}（退出码 0，如预期通过）`);
  else {
    failures += 1;
    console.error(`  ✗ ${name}：应通过但退出码 ${result.code}\n${result.output.slice(-400)}`);
  }
}

// F1：在临时目录构造最小产物并应用变更，返回 { dir, pub }。
function tempArtifact(mutate) {
  const dir = mkdtempSync(join(tmpdir(), "health-check-"));
  const pub = join(dir, "public");
  mkdirSync(pub, { recursive: true });
  buildMinimalArtifact(pub);
  mutate(pub);
  return { dir, pub };
}

console.log("[health-check 负例测试（自包含最小产物，F1）]\n");

const servers = [];

// 1) 完整最小产物应通过（基线）。
{
  const { dir, pub } = tempArtifact(() => {});
  const server = await startServer(pub, 5191);
  servers.push({ server, dir });
  expectPass("完整最小产物应通过", await runHealthCheck("http://127.0.0.1:5191"));
}

// 2) 缺失哈希 JS 资源应失败。
{
  const { dir, pub } = tempArtifact((p) => rmSync(join(p, FAKE.jsDir, "calculator.js"), { force: true }));
  const server = await startServer(pub, 5192);
  servers.push({ server, dir });
  expectFail("缺失哈希 JS 资源应失败", await runHealthCheck("http://127.0.0.1:5192"));
}

// 3) 坏 manifest（非 JSON）应失败。
{
  const { dir, pub } = tempArtifact((p) => writeFileSync(join(p, "data", "manifest.json"), "not-json{{{"));
  const server = await startServer(pub, 5193);
  servers.push({ server, dir });
  expectFail("坏 manifest 应失败", await runHealthCheck("http://127.0.0.1:5193"));
}

// 4) 缺失 manifest 应失败。
{
  const { dir, pub } = tempArtifact((p) => rmSync(join(p, "data", "manifest.json"), { force: true }));
  const server = await startServer(pub, 5194);
  servers.push({ server, dir });
  expectFail("缺失 manifest 应失败", await runHealthCheck("http://127.0.0.1:5194"));
}

// 5) 缺失首页应失败。
{
  const { dir, pub } = tempArtifact((p) => rmSync(join(p, "index.html"), { force: true }));
  const server = await startServer(pub, 5195);
  servers.push({ server, dir });
  expectFail("缺失首页应失败", await runHealthCheck("http://127.0.0.1:5195"));
}

// 6) F2：首页 404 但返回合法 index 正文（含 CSS/JS 引用）也必须失败（旧实现假绿）。
{
  const { dir, pub } = tempArtifact(() => {});
  const indexBody = readFileSync(join(pub, "index.html"));
  const server = await startServer(pub, 5196, {
    overrides: { "/index.html": { status: 404, body: indexBody } },
  });
  servers.push({ server, dir });
  expectFail("F2：首页 404 + 合法正文应失败", await runHealthCheck("http://127.0.0.1:5196"));
}

// 7) API 契约：503 + 稳定错误码 OCR_DISABLED 应通过（与 ocrService.js 实际响应体同形）。
{
  const { dir, pub } = tempArtifact(() => {});
  let server = await startServer(pub, 5197, {
    apiBehavior: {
      status: 503,
      body: JSON.stringify({ error: "当前环境未启用 OCR。", code: "OCR_DISABLED" }),
      json: true,
    },
  });
  servers.push({ server, dir });
  expectPass("API 503 OCR_DISABLED 应通过（契约合法）", await runHealthCheck("http://127.0.0.1:5197", ["--api"]));
  server.close();

  // 8) API 500 应失败（非契约合法）。
  server = await startServer(pub, 5198, { apiBehavior: { status: 500, body: "internal error", json: false } });
  servers.push({ server, dir });
  expectFail("API 500 应失败（非契约合法）", await runHealthCheck("http://127.0.0.1:5198", ["--api"]));
  server.close();

  // 9) API 503 但非 JSON 应失败（F6：503 分支要求 JSON 解析成功 + 稳定错误码）。
  server = await startServer(pub, 5199, { apiBehavior: { status: 503, body: "plain text, not json", json: false } });
  servers.push({ server, dir });
  expectFail("API 503 非 JSON 应失败", await runHealthCheck("http://127.0.0.1:5199", ["--api"]));
  server.close();

  // 10) F6：API 200 但非 JSON（text/plain "not-json"）应失败（旧实现假绿）。
  server = await startServer(pub, 5200, { apiBehavior: { status: 200, body: "not-json", json: false } });
  servers.push({ server, dir });
  expectFail("F6：API 200 非 JSON 应失败", await runHealthCheck("http://127.0.0.1:5200", ["--api"]));
  server.close();

  // 11) F6：API 200 但空对象 {} 应失败（缺 enabled / mode）。
  server = await startServer(pub, 5201, { apiBehavior: { status: 200, body: "{}", json: true } });
  servers.push({ server, dir });
  expectFail("F6：API 200 空对象应失败", await runHealthCheck("http://127.0.0.1:5201", ["--api"]));
  server.close();

  // 12) F6：API 200 但字段类型错误（enabled 字符串 / mode 非法值）应失败。
  server = await startServer(pub, 5202, {
    apiBehavior: {
      status: 200,
      body: JSON.stringify({ enabled: "yes", mode: "weird" }),
      json: true,
    },
  });
  servers.push({ server, dir });
  expectFail("F6：API 200 字段类型错误应失败", await runHealthCheck("http://127.0.0.1:5202", ["--api"]));
  server.close();

  // 13) F6：API 200 合法状态对象（enabled 布尔 + mode local）应通过。
  server = await startServer(pub, 5203, {
    apiBehavior: {
      status: 200,
      body: JSON.stringify({ enabled: true, mode: "local", timeoutSeconds: 60 }),
      json: true,
    },
  });
  servers.push({ server, dir });
  expectPass("F6：API 200 合法状态对象应通过", await runHealthCheck("http://127.0.0.1:5203", ["--api"]));
  server.close();
}

// 清理：关闭所有服务器、删除临时目录。
for (const { server, dir } of servers) {
  try { server.close(); } catch {}
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(`\n[health-check 负例测试] ${failures === 0 ? "全部通过" : `${failures} 项失败`}`);
process.exit(failures > 0 ? 1 : 0);