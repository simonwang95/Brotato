import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { existsSync, rmSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const port = 47300 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;

const child = spawn(process.execPath, ["scripts/dev-server.mjs"], {
  cwd: rootDir,
  env: { ...process.env, PORT: String(port), OCR_ENABLED: "0" },
  stdio: ["ignore", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";
child.stdout.on("data", (chunk) => (stdout += chunk));
child.stderr.on("data", (chunk) => (stderr += chunk));

function cleanup() {
  if (!child.killed) child.kill("SIGKILL");
}
process.on("exit", cleanup);

async function waitForServer() {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`dev-server exited early:\n${stdout}\n${stderr}`);
    }
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.status === 200) return;
    } catch {
      // 尚未就绪
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`dev-server did not become ready:\n${stdout}\n${stderr}`);
}

async function http(path, { method = "GET", body } = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    body,
    headers: body ? { "Content-Type": "application/json" } : {},
  });
  const text = await response.text();
  return { status: response.status, text, headers: response.headers };
}

try {
  await waitForServer();

  // --- 监听地址：日志必须显示真实回环地址 ---
  assert.ok(
    stdout.includes(`http://127.0.0.1:${port}`),
    `启动日志应显示真实监听地址，实际：${stdout}`,
  );

  // --- 正常资源：200 ---
  {
    const home = await http("/");
    assert.equal(home.status, 200, "首页应返回 200");
    assert.ok(home.text.includes("Brotato"), "首页内容正确");
    assert.ok((home.headers.get("content-type") || "").includes("text/html"));
    assert.ok(home.headers.get("content-security-policy"), "响应应携带 CSP 头");

    const index = await http("/index.html");
    assert.equal(index.status, 200);

    const js = await http("/src/app.js");
    assert.equal(js.status, 200, "浏览器 JS 应返回 200");
    assert.ok((js.headers.get("content-type") || "").includes("javascript"));

    const css = await http("/styles.css");
    assert.equal(css.status, 200, "CSS 应返回 200");
    assert.ok((css.headers.get("content-type") || "").includes("text/css"));

    const json = await http("/data/official-catalog.json");
    assert.equal(json.status, 200, "公开 JSON 应返回 200");
    assert.ok((json.headers.get("content-type") || "").includes("application/json"));
    JSON.parse(json.text);

    if (existsSync(join(rootDir, "data/assets/characters/character_well_rounded.webp"))) {
      const webp = await http("/data/assets/characters/character_well_rounded.webp");
      assert.equal(webp.status, 200, "WebP 资源应返回 200");
      assert.ok((webp.headers.get("content-type") || "").includes("image/webp"));
    }
  }

  // --- 非公开路径：403 ---
  for (const path of [
    "/env.local",
    "/env.local.example",
    "/.git/config",
    "/.gitignore",
    "/source/",
    "/source/anything.bin",
    "/scripts/dev-server.mjs",
    "/tests/calculator.test.mjs",
    "/api/parse-screenshot.js",
    "/docs/vercel-deployment.md",
    "/package.json",
    "/vercel.json",
    "/README.md",
  ]) {
    const res = await http(path);
    assert.ok(
      res.status === 403 || res.status === 404,
      `${path} 应被拒绝，实际 ${res.status}`,
    );
    assert.ok(!res.text.includes("API_KEY"), `${path} 不得泄露内容`);
  }

  // --- 路径穿越与同前缀目录 ---
  {
    const encoded = await http("/%2e%2e/env.local");
    assert.ok(encoded.status === 400 || encoded.status === 403, "编码穿越应被拒绝");

    const traversal = await http("/src/..%2f..%2fenv.local");
    assert.ok(traversal.status === 400 || traversal.status === 403, "src 下穿越应被拒绝");

    const sibling = await http("/srcx/app.js");
    assert.equal(sibling.status, 403, "同前缀兄弟目录应被拒绝");

    const dotDir = await http("/.hidden/file.txt");
    assert.equal(dotDir.status, 403, "dotfile 目录应被拒绝");
  }

  // --- 符号链接不能指向仓库内非公开文件 ---
  {
    const linkPath = join(rootDir, "src", "__test_symlink_escape__");
    try {
      if (existsSync(linkPath)) rmSync(linkPath);
      symlinkSync("../package.json", linkPath);
      const res = await http("/src/__test_symlink_escape__");
      assert.equal(res.status, 403, "符号链接指向非公开文件应被拒绝");
    } finally {
      if (existsSync(linkPath)) rmSync(linkPath);
    }
  }

  // --- 目录与缺失文件：404 ---
  {
    assert.equal((await http("/src/")).status, 404, "目录请求应返回 404");
    assert.equal((await http("/data/")).status, 404, "目录请求应返回 404");
    assert.equal((await http("/src/nope.js")).status, 404, "allowlist 内缺失文件应返回 404");
    assert.equal((await http("/nope")).status, 403, "非 allowlist 路径 fail-closed 返回 403");
  }

  // --- 畸形 URI：400 且不崩溃 ---
  {
    const badEncoding = await http("/foo%zz");
    assert.equal(badEncoding.status, 400, "坏编码应返回 400");

    const badUrl = await http("/foo%");
    assert.ok(badUrl.status === 400 || badUrl.status === 404, "畸形 URI 不应 5xx");
  }

  // --- 方法限制 ---
  {
    assert.equal((await http("/", { method: "DELETE" })).status, 405);
    assert.equal((await http("/api/other", { method: "POST", body: "{}" })).status, 405);
  }

  // --- OCR 接口：本地显式关闭时返回 503，状态接口返回 200 ---
  {
    const status = await http("/api/parse-screenshot");
    assert.equal(status.status, 200, "GET 状态接口应返回 200");
    const payload = JSON.parse(status.text);
    assert.equal(payload.enabled, false, "OCR_ENABLED=0 时应报告关闭");
    assert.equal(payload.mode, "local");

    const post = await http("/api/parse-screenshot", {
      method: "POST",
      body: JSON.stringify({
        imageDataUrl:
          "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      }),
    });
    assert.equal(post.status, 503, "关闭时应返回 503 且不调用上游");
    assert.equal(JSON.parse(post.text).code, "OCR_DISABLED");

    const badJson = await http("/api/parse-screenshot", {
      method: "POST",
      body: "not-json",
    });
    assert.equal(badJson.status, 400, "坏 JSON 应返回 400");
    assert.equal(JSON.parse(badJson.text).code, "INVALID_JSON");

    for (const invalidObject of ["null", "123", "[]"]) {
      const invalid = await http("/api/parse-screenshot", {
        method: "POST",
        body: invalidObject,
      });
      assert.equal(invalid.status, 400, `${invalidObject} 不应导致本地服务异常`);
      assert.equal(JSON.parse(invalid.text).code, "INVALID_JSON");
    }

    const oversized = await http("/api/parse-screenshot", {
      method: "POST",
      body: JSON.stringify({ imageDataUrl: "a".repeat(25 * 1024 * 1024 + 1) }),
    });
    assert.equal(oversized.status, 413, "超大请求体应返回 413");
  }

  // --- 进程存活：所有异常请求之后仍应正常服务 ---
  {
    const alive = await http("/");
    assert.equal(alive.status, 200, "异常请求之后进程仍应存活");
  }
} finally {
  cleanup();
  await new Promise((resolve) => {
    if (child.exitCode !== null) resolve();
    else child.once("exit", resolve);
  });
}

console.log("Dev server HTTP tests passed");
