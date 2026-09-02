// R3 负例：验证 health-check 对缺失哈希资源 / 坏 manifest / 非 JSON API 稳定失败（不 fail-open）。
// 通过子进程运行 scripts/health-check.mjs 并断言退出码。全部用 node http 服务（避免 python 进程残留）。
import { execFile } from "node:child_process";
import { mkdtempSync, cpSync, rmSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "node:http";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const scriptPath = join(rootDir, "scripts", "health-check.mjs");

// 起一个静态服务（node http），返回指定目录；可选 apiBehavior 用于 /api/parse-screenshot。
function startServer(dir, port, apiBehavior = null) {
  const server = createServer((req, res) => {
    if (apiBehavior && req.url === "/api/parse-screenshot") {
      const { status, body, json } = apiBehavior;
      res.writeHead(status, { "content-type": json ? "application/json" : "text/plain" });
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

// 复制 public/ 到临时目录并应用变更，返回 { dir, pub }。
function tempPublic(mutate) {
  const dir = mkdtempSync(join(tmpdir(), "health-check-"));
  const pub = join(dir, "public");
  cpSync(join(rootDir, "public"), pub, { recursive: true });
  mutate(pub);
  return { dir, pub };
}

console.log("[health-check 负例测试]\n");

const servers = [];

// 1) 正常 public/ 应通过（基线）。
{
  const { dir } = tempPublic(() => {});
  const server = await startServer(join(dir, "public"), 5181);
  servers.push({ server, dir });
  expectPass("完整 public/ 应通过", await runHealthCheck("http://127.0.0.1:5181"));
}

// 2) 缺失哈希 JS 资源应失败。
{
  const { dir, pub } = tempPublic((p) => {
    const m = readFileSync(join(p, "index.html"), "utf8").match(/src\/(v[^/]+)\//);
    if (m) rmSync(join(p, "src", m[1], "calculator.js"), { force: true });
  });
  const server = await startServer(pub, 5182);
  servers.push({ server, dir });
  expectFail("缺失哈希 JS 资源应失败", await runHealthCheck("http://127.0.0.1:5182"));
}

// 3) 坏 manifest（非 JSON）应失败。
{
  const { dir, pub } = tempPublic((p) => writeFileSync(join(p, "data", "manifest.json"), "not-json{{{"));
  const server = await startServer(pub, 5183);
  servers.push({ server, dir });
  expectFail("坏 manifest 应失败", await runHealthCheck("http://127.0.0.1:5183"));
}

// 4) 缺失 manifest 应失败。
{
  const { dir, pub } = tempPublic((p) => rmSync(join(p, "data", "manifest.json"), { force: true }));
  const server = await startServer(pub, 5184);
  servers.push({ server, dir });
  expectFail("缺失 manifest 应失败", await runHealthCheck("http://127.0.0.1:5184"));
}

// 5) 缺失首页应失败。
{
  const { dir, pub } = tempPublic((p) => rmSync(join(p, "index.html"), { force: true }));
  const server = await startServer(pub, 5185);
  servers.push({ server, dir });
  expectFail("缺失首页应失败", await runHealthCheck("http://127.0.0.1:5185"));
}

// 6) API 契约：503 OCR_DISABLED 应通过，其它 5xx / 非 JSON 应失败。
{
  const { dir, pub } = tempPublic(() => {});
  let server = await startServer(pub, 5186, { status: 503, body: JSON.stringify({ error: "OCR_DISABLED" }), json: true });
  servers.push({ server, dir });
  expectPass("API 503 OCR_DISABLED 应通过（契约合法）", await runHealthCheck("http://127.0.0.1:5186", ["--api"]));
  server.close();

  server = await startServer(pub, 5187, { status: 500, body: "internal error", json: false });
  servers.push({ server, dir });
  expectFail("API 500 应失败（非契约合法）", await runHealthCheck("http://127.0.0.1:5187", ["--api"]));
  server.close();

  server = await startServer(pub, 5188, { status: 503, body: "plain text, not json", json: false });
  servers.push({ server, dir });
  expectFail("API 非 JSON 响应应失败", await runHealthCheck("http://127.0.0.1:5188", ["--api"]));
  server.close();
}

// 清理：关闭所有服务器、删除临时目录。
for (const { server, dir } of servers) {
  try { server.close(); } catch {}
  try { rmSync(dir, { recursive: true, force: true }); } catch {}
}
console.log(`\n[health-check 负例测试] ${failures === 0 ? "全部通过" : `${failures} 项失败`}`);
process.exit(failures > 0 ? 1 : 0);