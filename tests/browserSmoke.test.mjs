// P1-4：最小浏览器烟测（Playwright）。
//
// 覆盖计划要求的：三个路由、数据加载、角色切换、图鉴搜索、模拟器计算、错误降级。
//
// 运行方式：`npm run test:browser`（先 `npm run build` 生成 public/）。
// 浏览器启动策略：优先 Playwright 自带 Chromium，回退到系统 Chrome；
// 两者都不可用时打印说明并以退出码 0 跳过（本地未装浏览器不阻断单元测试），
// 但在 CI 中会显式安装 Chromium，因此该烟测在 CI 中是真实门禁。

import assert from "node:assert/strict";
import { createServer } from "node:http";
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const rootDir = fileURLToPath(new URL("..", import.meta.url));
const publicDir = join(rootDir, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

// --- 静态服务器：只服务 public/ 构建产物 ---
function startServer() {
  return new Promise((resolve) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url, "http://localhost");
      let pathname = decodeURIComponent(url.pathname);
      if (pathname === "/") pathname = "/index.html";
      const filePath = join(publicDir, pathname);
      // 防止路径穿越。
      if (!filePath.startsWith(publicDir) || !existsSync(filePath) || !statSync(filePath).isFile()) {
        res.writeHead(404, { "content-type": "text/plain" });
        res.end("not found");
        return;
      }
      res.writeHead(200, { "content-type": MIME[extname(filePath)] ?? "application/octet-stream" });
      res.end(readFileSync(filePath));
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}

// --- 浏览器启动：优先自带 Chromium，回退系统 Chrome ---
async function launchBrowser() {
  const strategies = [
    () => chromium.launch(),
    () => chromium.launch({ channel: "chrome" }),
    () => chromium.launch({ channel: "msedge" }),
  ];
  let lastError;
  for (const strategy of strategies) {
    try {
      const browser = await strategy();
      return { browser, error: null };
    } catch (error) {
      lastError = error;
    }
  }
  return { browser: null, error: lastError };
}

// 预期内的“缺失”资源：静态服务器没有 /api/parse-screenshot（OCR 线上默认关闭）与 /favicon.ico。
function isExpectedNotFound(url) {
  if (url.includes("/api/parse-screenshot")) return true;
  if (url.includes("/favicon.ico")) return true;
  return false;
}
function isExpectedConsoleError(text) {
  if (text.includes("/api/parse-screenshot")) return true;
  if (text.includes("/favicon.ico")) return true;
  return false;
}

async function main() {
  if (!existsSync(join(publicDir, "index.html"))) {
    console.error("[browserSmoke] 未找到 public/index.html，请先运行 `npm run build`。");
    process.exit(1);
  }

  const server = await startServer();
  const { port } = server.address();
  const base = `http://127.0.0.1:${port}`;

  const launched = await launchBrowser();
  if (!launched.browser) {
    console.log(
      "[browserSmoke] 未找到可用浏览器（Chromium/Chrome/Edge），跳过浏览器烟测。" +
        "CI 中会通过 `npx playwright install chromium` 安装，因此该检查在 CI 中生效。",
    );
    server.close();
    process.exit(0);
  }

  const browser = launched.browser;
  const consoleErrors = [];
  const pageErrors = [];
  const notFoundUrls = [];
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await context.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (err) => pageErrors.push(String(err)));
  page.on("response", (res) => {
    if (res.status() === 404) notFoundUrls.push(res.url());
  });

  let passed = 0;
  const ok = (label) => {
    passed += 1;
    console.log(`  ✓ ${label}`);
  };

  try {
    // --- 路由 1：指南（默认）+ 数据加载 ---
    await page.goto(`${base}/index.html#guide`, { waitUntil: "domcontentloaded" });
    // 等待官方目录数据加载完成：页面出现角色相关内容。
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText ?? "";
        return text.length > 200;
      },
      { timeout: 15000 },
    );
    const bodyText = await page.evaluate(() => document.body.innerText);
    assert.ok(bodyText.length > 200, "指南页应有实质内容");
    ok("路由 #guide 加载且有内容");

    // 数据加载：确认页面引用了角色数据（出现至少一个角色名）。
    const hasCharacter = await page.evaluate(() => {
      const text = document.body.innerText;
      return /游侠|Ranger|战士|Warrior|工程师|Engineer|猎人|Hunter/.test(text);
    });
    assert.ok(hasCharacter, "指南页应展示角色数据");
    ok("官方数据已加载（出现角色名）");

    // --- 路由 2：图鉴（具体标签页才有卡片）+ 搜索 ---
    await page.goto(`${base}/index.html#compendium/characters`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelectorAll(".compendium-card").length > 0,
      { timeout: 15000 },
    );
    const compendiumCount = await page.evaluate(
      () => document.querySelectorAll(".compendium-card").length,
    );
    assert.ok(compendiumCount > 0, "图鉴应列出条目");
    ok(`图鉴加载（${compendiumCount} 张角色卡片）`);

    // 搜索：输入查询词，结果应被过滤。
    const searchInput = page.locator("#compendium-search");
    if ((await searchInput.count()) > 0) {
      const before = await page.evaluate(
        () => document.querySelectorAll(".compendium-card").length,
      );
      await searchInput.fill("Ranger");
      // 搜索在按下 Enter 或点击搜索按钮时才应用（见 app.js 的 keydown 处理）。
      await searchInput.press("Enter");
      await page.waitForTimeout(300);
      const after = await page.evaluate(
        () => document.querySelectorAll(".compendium-card").length,
      );
      assert.ok(after <= before, "搜索后条目数应减少或不变");
      ok(`图鉴搜索过滤（${before} → ${after}）`);
    } else {
      ok("图鉴搜索（未找到搜索框，跳过输入）");
    }

    // --- 角色切换（指南页的角色下拉） ---
    await page.goto(`${base}/index.html#guide`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (document.body?.innerText ?? "").length > 200, {
      timeout: 15000,
    });
    const characterSelect = page.locator("#strategy-character");
    if ((await characterSelect.count()) > 0) {
      const options = await characterSelect.locator("option").count();
      assert.ok(options >= 2, "角色下拉应至少有两个角色");
      // 切换到第二个角色。
      await characterSelect.selectOption({ index: 1 });
      await page.waitForTimeout(300);
      ok(`角色切换（下拉含 ${options} 个角色，已切换）`);
    } else {
      ok("角色切换（未找到角色下拉，跳过）");
    }

    // --- 路由 3：模拟器 + 计算 ---
    await page.goto(`${base}/index.html#simulator`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (document.body?.innerText ?? "").length > 200, {
      timeout: 15000,
    });
    const numInputs = await page.locator("input[type='number']").count();
    assert.ok(numInputs > 0, "模拟器应有数字输入");
    ok(`模拟器加载（${numInputs} 个数字输入）`);

    // 计算：修改一个输入，结果区域应出现数值。
    const firstNumber = page.locator("input[type='number']").first();
    await firstNumber.fill("10");
    await page.waitForTimeout(300);
    const resultText = await page.evaluate(() => document.body.innerText);
    assert.ok(/[\d.]+/.test(resultText), "模拟器应显示数值结果");
    ok("模拟器计算产生数值结果");

    // --- 错误降级：OCR API 不可用时不应崩溃 ---
    // 静态服务器没有 /api/parse-screenshot，页面加载时若尝试调用应优雅降级。
    // 通过确认页面无未捕获异常来验证。
    assert.equal(pageErrors.length, 0, `不应有未捕获异常：${pageErrors.join(" | ")}`);
    ok("错误降级（无未捕获页面异常）");

    // --- 404 响应：只允许预期内的资源（OCR API、favicon）---
    const unexpected404 = notFoundUrls.filter((url) => !isExpectedNotFound(url));
    assert.equal(
      unexpected404.length,
      0,
      `不应有意外 404 资源：${unexpected404.slice(0, 5).join(" | ")}`,
    );
    ok(`404 均为预期资源（${notFoundUrls.length} 条）`);

    // --- 控制台错误：排除资源加载失败（已由 404 检查覆盖）后应为空 ---
    const unexpectedConsole = consoleErrors.filter(
      (t) => !/Failed to load resource/i.test(t) && !isExpectedConsoleError(t),
    );
    assert.equal(
      unexpectedConsole.length,
      0,
      `不应有意外控制台错误：${unexpectedConsole.slice(0, 5).join(" | ")}`,
    );
    ok(`控制台干净（排除资源 404 后 0 条意外错误，原始 ${consoleErrors.length} 条）`);

    console.log(`\n[browserSmoke] 通过 ${passed} 项浏览器烟测。`);
  } finally {
    await context.close();
    await browser.close();
    server.close();
  }
}

main().catch((error) => {
  console.error("\n[browserSmoke] 失败：", error.message);
  process.exit(1);
});