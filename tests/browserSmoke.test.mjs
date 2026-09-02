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
import { DEFAULT_ITEM_DELTA, DEFAULT_STATS, compareItem } from "../src/calculator.js";
import { weaponRecordToSimulator } from "../src/weaponImport.js";

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

    // F4 带入模拟器：必须进入武器页（角色页没有武器卡片，旧版在此静默跳过导致导入从未被验证）。
    // 导入按钮是武器页的必需控件（强制断言，不允许跳过）；点击后验证：
    // 跳转模拟器 + 来源说明 + 模拟器字段值与官方目录记录一致（展示层 2 位小数）。
    await page.goto(`${base}/index.html#compendium/weapons`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelectorAll(".compendium-card").length > 0,
      { timeout: 15000 },
    );
    const weaponCards = await page.evaluate(() => document.querySelectorAll(".compendium-card").length);
    assert.ok(weaponCards > 0, "武器页应列出武器卡片");
    const importBtn = page.locator(".compendium-import").first();
    assert.ok((await importBtn.count()) > 0, "武器页的“带入模拟器”按钮是必需控件，应存在");
    const importNameKey = await importBtn.getAttribute("data-import-weapon");
    assert.ok(importNameKey, "“带入模拟器”按钮应携带官方 nameKey（data-import-weapon）");

    // Node 侧查找官方记录（最低阶级，与 app.js 的 findCatalogWeaponRecord 同源）作为字段期望值。
    const catalog = JSON.parse(readFileSync(join(rootDir, "data", "official-catalog.json"), "utf8"));
    const matches = catalog.records.filter((r) => r.kind === "weapon" && r.nameKey === importNameKey);
    assert.ok(matches.length > 0, `官方目录应包含 ${importNameKey} 记录`);
    matches.sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0));
    const record = matches[0];
    const localization = JSON.parse(readFileSync(join(rootDir, "data", "official-localization.json"), "utf8"));
    const locEntry = localization.entries?.[importNameKey];
    const weaponName = locEntry ? `${locEntry.cnName}（${locEntry.enName}）` : importNameKey;

    await importBtn.click();
    await page.waitForTimeout(500);
    const hash = await page.evaluate(() => location.hash);
    assert.ok(hash.includes("simulator"), `点击"带入模拟器"后应跳转到模拟器（当前 hash：${hash}）`);
    const sourceText = await page.evaluate(
      () => document.querySelector("#sim-weapon-source")?.textContent ?? "",
    );
    assert.ok(sourceText.includes("已带入官方武器参数"), `来源说明应标注官方武器参数（实际：${sourceText}）`);
    assert.ok(sourceText.includes(weaponName), `来源说明应包含武器名 ${weaponName}（实际：${sourceText}）`);
    ok(`图鉴带入模拟器（${weaponName}，跳转模拟器并显示来源）`);

    // F4 字段来源断言：模拟器输入值应与官方记录一致。
    // P1-A：显示值必须与传入计算器的值一致，不做展示层舍入——
    // 期望值与 weaponRecordToSimulator 的 state 值完全相同（冷却为帧/60 原值）。
    const r2 = (x) => Math.round(x * 100) / 100;
    const s = record.stats ?? {};
    const expectedFields = {
      "基础伤害": s.damage,
      "基础冷却 秒": (s.cooldown ?? 60) / 60,
      "每次命中数": s.nb_projectiles ?? 1,
      "武器暴击率 %": r2((s.crit_chance ?? 0) * 100),
      "暴击倍率": s.crit_damage,
      "穿透次数": s.piercing ?? 0,
      "穿透伤害保留": r2(1 - (s.piercing_dmg_reduction ?? 0.5)),
      "弹射次数": s.bounce ?? 0,
      "弹射伤害保留": r2(1 - (s.bounce_dmg_reduction ?? 0.5)),
    };
    const expectedScaling = { "近战缩放 %": 0, "远程缩放 %": 0, "元素缩放 %": 0, "工程缩放 %": 0 };
    (s.scalingStats ?? []).forEach((entry) => {
      if (entry.stat === "stat_melee_damage") expectedScaling["近战缩放 %"] = r2((entry.value ?? 0) * 100);
      else if (entry.stat === "stat_ranged_damage") expectedScaling["远程缩放 %"] = r2((entry.value ?? 0) * 100);
      else if (entry.stat === "stat_elemental_damage") expectedScaling["元素缩放 %"] = r2((entry.value ?? 0) * 100);
      else if (entry.stat === "stat_engineering") expectedScaling["工程缩放 %"] = r2((entry.value ?? 0) * 100);
    });
    const fieldLabels = [...Object.keys(expectedFields), ...Object.keys(expectedScaling)];
    const fieldValues = await page.evaluate((labels) => {
      const out = {};
      for (const label of labels) {
        const el = document.querySelector(`input[aria-label="${label}"]`);
        out[label] = el ? el.value : null;
      }
      return out;
    }, fieldLabels);
    for (const [label, want] of Object.entries({ ...expectedFields, ...expectedScaling })) {
      assert.equal(
        fieldValues[label],
        String(want),
        `模拟器字段 ${label} 应为 ${want}（官方 ${importNameKey} 记录，实际 ${fieldValues[label]}）`,
      );
    }
    ok(`字段来源断言（${fieldLabels.length} 个字段与官方记录 ${importNameKey} 一致）`);

    // P1-A：显示值 === 计算值。用链枪（2 帧冷却 = 0.03333333333333333 秒，
    // 非 2 位小数整值）验证三件事：
    // (1) 字段显示完整精度原值（不做展示层舍入）；
    // (2) 页面显示的 DPS 与 Node 侧同精度计算结果一致；
    // (3) 重新输入所见冷却值后 DPS 不变（所见即所算，无静默漂移）。
    // 注意：上一步导入标枪后已跳转到模拟器，链枪卡片在武器页（排序后第 49 位，
    // 超出默认 24 张首屏），需返回武器页并"加载更多"到链枪可见后再导入。
    await page.goto(`${base}/index.html#compendium/weapons`, { waitUntil: "domcontentloaded" });
    await page.waitForFunction(
      () => document.querySelectorAll(".compendium-card").length > 0,
      { timeout: 15000 },
    );
    for (let i = 0; i < 12; i++) {
      if ((await page.locator('[data-import-weapon="WEAPON_CHAIN_GUN"]').count()) > 0) break;
      const loadMore = page.locator("[data-compendium-loadmore]");
      if ((await loadMore.count()) === 0) break;
      await loadMore.click();
      await page.waitForTimeout(300);
    }
    const chainGunBtn = page.locator('[data-import-weapon="WEAPON_CHAIN_GUN"]');
    assert.ok((await chainGunBtn.count()) > 0, "武器页应包含链枪卡片（P1-A 显示/计算一致性样本）");
    await chainGunBtn.click();
    await page.waitForTimeout(500);

    const chainRecord = catalog.records
      .filter((r) => r.kind === "weapon" && r.nameKey === "WEAPON_CHAIN_GUN")
      .sort((a, b) => (a.tier ?? 0) - (b.tier ?? 0))[0];
    const cs = chainRecord.stats ?? {};
    // 期望值与 weaponRecordToSimulator 的 state 值逐项一致（完整精度）。
    const chainExpected = {
      "基础伤害": cs.damage,
      "基础冷却 秒": (cs.cooldown ?? 60) / 60,
      "每次命中数": cs.nb_projectiles ?? 1,
      "武器暴击率 %": r2((cs.crit_chance ?? 0) * 100),
      "暴击倍率": cs.crit_damage,
      "穿透次数": cs.piercing ?? 0,
      "穿透伤害保留": r2(1 - (cs.piercing_dmg_reduction ?? 0.5)),
      "弹射次数": cs.bounce ?? 0,
      "弹射伤害保留": r2(1 - (cs.bounce_dmg_reduction ?? 0.5)),
      "近战缩放 %": 0,
      "远程缩放 %": 0,
      "元素缩放 %": 0,
      "工程缩放 %": 0,
    };
    (cs.scalingStats ?? []).forEach((entry) => {
      if (entry.stat === "stat_melee_damage") chainExpected["近战缩放 %"] = r2((entry.value ?? 0) * 100);
      else if (entry.stat === "stat_ranged_damage") chainExpected["远程缩放 %"] = r2((entry.value ?? 0) * 100);
      else if (entry.stat === "stat_elemental_damage") chainExpected["元素缩放 %"] = r2((entry.value ?? 0) * 100);
      else if (entry.stat === "stat_engineering") chainExpected["工程缩放 %"] = r2((entry.value ?? 0) * 100);
    });
    const chainFieldValues = await page.evaluate((labels) => {
      const out = {};
      for (const label of labels) {
        const el = document.querySelector(`input[aria-label="${label}"]`);
        out[label] = el ? el.value : null;
      }
      return out;
    }, Object.keys(chainExpected));
    for (const [label, want] of Object.entries(chainExpected)) {
      assert.equal(
        chainFieldValues[label],
        String(want),
        `链枪字段 ${label} 应显示完整精度值 ${want}（实际 ${chainFieldValues[label]}）`,
      );
    }
    ok(`链枪字段显示完整精度（${Object.keys(chainExpected).length} 个字段，冷却 ${chainExpected["基础冷却 秒"]} 秒）`);

    // (2) 页面 DPS 与 Node 侧全精度计算一致（同一 formatNumber：zh-CN 2 位小数）。
    const chainWeapon = weaponRecordToSimulator(chainRecord);
    const chainComparison = compareItem({ ...DEFAULT_STATS }, chainWeapon, { ...DEFAULT_ITEM_DELTA }, {
      roundingMode: "none",
    });
    const formatPageNumber = (value) =>
      Number(value).toLocaleString("zh-CN", { maximumFractionDigits: 2, minimumFractionDigits: 2 });
    const expectedChainDps = formatPageNumber(chainComparison.before.dps);
    const readCurrentDps = () =>
      page.evaluate(() => {
        const metric = [...document.querySelectorAll("#summary .metric")].find((el) =>
          el.querySelector("span")?.textContent === "当前 DPS",
        );
        return metric?.querySelector("strong")?.textContent ?? null;
      });
    const chainDpsBefore = await readCurrentDps();
    assert.equal(
      chainDpsBefore,
      expectedChainDps,
      `链枪页面 DPS 应为 ${expectedChainDps}（Node 侧全精度计算，实际 ${chainDpsBefore}）`,
    );
    ok(`链枪页面 DPS 与全精度计算一致（${expectedChainDps}）`);

    // (3) 重新输入所见冷却值：DPS 必须不变（显示值 === 计算值，无静默漂移）。
    const chainCooldown = page.locator('input[aria-label="基础冷却 秒"]');
    const displayedCooldown = await chainCooldown.inputValue();
    await chainCooldown.fill(displayedCooldown);
    await page.waitForTimeout(300);
    const chainDpsAfter = await readCurrentDps();
    assert.equal(
      chainDpsAfter,
      chainDpsBefore,
      `重新输入所见冷却值 ${displayedCooldown} 后 DPS 应不变（${chainDpsBefore} → ${chainDpsAfter}）`,
    );
    ok(`重输所见冷却值 ${displayedCooldown} 后 DPS 不变（${chainDpsAfter}）`);

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