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
    // R5 fail-closed：CI 中浏览器启动失败必须非零退出（真实门禁）；
    // 本地仅当显式设置 BROWSER_SMOKE_SKIP=1 时才跳过（避免未装浏览器阻断单元测试）。
    const isCI = Boolean(process.env.CI);
    if (isCI) {
      console.error(
        `[browserSmoke] CI 中未找到可用浏览器（Chromium/Chrome/Edge），烟测失败。` +
          `请先运行 \`npx playwright install chromium\`。原因：${launched.error?.message ?? "unknown"}`,
      );
      server.close();
      process.exit(1);
    }
    if (process.env.BROWSER_SMOKE_SKIP === "1") {
      console.log(
        "[browserSmoke] 本地未找到可用浏览器且 BROWSER_SMOKE_SKIP=1，显式跳过浏览器烟测。",
      );
      server.close();
      process.exit(0);
    }
    // 本地未设显式 flag：默认仍视为失败（fail-closed），提示安装或显式跳过。
    console.error(
      `[browserSmoke] 本地未找到可用浏览器（Chromium/Chrome/Edge）。` +
        `请运行 \`npx playwright install chromium\`，或设置 BROWSER_SMOKE_SKIP=1 显式跳过。` +
        `原因：${launched.error?.message ?? "unknown"}`,
    );
    server.close();
    process.exit(1);
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

    // 搜索（R5）：搜索框是必需控件，必须存在；搜索后结果应严格减少且包含查询词。
    const searchInput = page.locator("#compendium-search");
    assert.ok((await searchInput.count()) > 0, "图鉴搜索框（#compendium-search）是必需控件，应存在");
    const before = await page.evaluate(() => document.querySelectorAll(".compendium-card").length);
    await searchInput.fill("Ranger");
    // 搜索在按下 Enter 或点击搜索按钮时才应用（见 app.js 的 keydown 处理）。
    await searchInput.press("Enter");
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.querySelectorAll(".compendium-card").length);
    const afterText = await page.evaluate(() =>
      [...document.querySelectorAll(".compendium-card")].map((c) => c.innerText).join("\n"),
    );
    assert.ok(after < before, `搜索 "Ranger" 后条目数应严格减少（${before} → ${after}）`);
    assert.ok(/Ranger|游侠/i.test(afterText), `搜索结果应包含 "Ranger"（游侠）卡片`);
    ok(`图鉴搜索过滤（${before} → ${after}，含 Ranger）`);

    // R5 加载更多：清空搜索后，若存在"加载更多"按钮，点击应增加可见卡片数。
    await searchInput.fill("");
    await searchInput.press("Enter");
    await page.waitForTimeout(300);
    const loadMoreBtn = page.locator("[data-compendium-loadmore]");
    if ((await loadMoreBtn.count()) > 0) {
      const beforeMore = await page.evaluate(() => document.querySelectorAll(".compendium-card").length);
      await loadMoreBtn.click();
      await page.waitForTimeout(300);
      const afterMore = await page.evaluate(() => document.querySelectorAll(".compendium-card").length);
      assert.ok(afterMore > beforeMore, `点击"加载更多"后卡片数应增加（${beforeMore} → ${afterMore}）`);
      ok(`图鉴加载更多（${beforeMore} → ${afterMore}）`);
    } else {
      ok("图鉴加载更多（当前结果未超首批，无加载更多按钮）");
    }

    // R5 带入模拟器：武器卡片应带"带入模拟器"按钮，点击后应跳转到模拟器。
    const importBtn = page.locator(".compendium-import").first();
    if ((await importBtn.count()) > 0) {
      await importBtn.click();
      await page.waitForTimeout(500);
      const hash = await page.evaluate(() => location.hash);
      assert.ok(hash.includes("simulator"), `点击"带入模拟器"后应跳转到模拟器（当前 hash：${hash}）`);
      ok("图鉴带入模拟器（跳转模拟器）");
    } else {
      ok("图鉴带入模拟器（当前无武器卡片，跳过）");
    }

    // --- 角色切换（指南页的角色下拉） ---
    await page.goto(`${base}/index.html#guide`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(() => (document.body?.innerText ?? "").length > 200, {
      timeout: 15000,
    });
    const characterSelect = page.locator("#strategy-character");
    // R5：角色下拉是必需控件，必须存在。
    assert.ok((await characterSelect.count()) > 0, "角色下拉（#strategy-character）是必需控件，应存在");
    const options = await characterSelect.locator("option").count();
    assert.ok(options >= 2, "角色下拉应至少有两个角色");
    // 记录切换前的指南内容，切换后应变化（R5：断言内容变化而非仅"已切换"）。
    const contentBefore = await page.evaluate(() => document.body.innerText);
    await characterSelect.selectOption({ index: 1 });
    await page.waitForTimeout(300);
    const contentAfter = await page.evaluate(() => document.body.innerText);
    assert.notEqual(contentAfter, contentBefore, "切换角色后指南内容应变化");
    ok(`角色切换（下拉含 ${options} 个角色，内容已变化）`);

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

    // R5 非法输入：输入极端/非法值（负数、超大数）应被夹取或拒绝，不产生 NaN/Infinity。
    await firstNumber.fill("-1000");
    await page.waitForTimeout(300);
    const invalidResult = await page.evaluate(() => document.body.innerText);
    assert.ok(!/NaN|Infinity/.test(invalidResult), "非法输入（-1000）不应产生 NaN/Infinity");
    ok("非法输入被安全夹取（无 NaN/Infinity）");

    // R5 移动端 sticky：缩小到移动端视口（≤920px），模拟器吸底摘要应出现（position: fixed）。
    await page.setViewportSize({ width: 480, height: 800 });
    await page.waitForTimeout(300);
    const stickyVisible = await page.evaluate(() => {
      const el = document.querySelector(".sim-sticky-summary");
      if (!el) return false;
      const style = getComputedStyle(el);
      return style.display !== "none" && (style.position === "fixed" || style.position === "sticky");
    });
    assert.ok(stickyVisible, "移动端视口下模拟器吸底摘要应可见（sticky/fixed）");
    ok("移动端 sticky 摘要可见");
    // 恢复桌面视口。
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.waitForTimeout(200);

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