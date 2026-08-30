import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { escapeHtml, metric, metricDelta, renderList, renderPills } from "../src/renderUtils.js";

const rootDir = fileURLToPath(new URL("..", import.meta.url));

// 用 charCode 构造实体期望值，避免测试源码中的实体字面量被工具链改写。
const E = (name) => String.fromCharCode(38) + name + ";";
const EXPECT_LT_SCRIPT = E("lt") + "script" + E("gt");
const EXPECT_GT_SCRIPT = E("lt") + "/script" + E("gt");

// --- escapeHtml 基础 ---
assert.equal(escapeHtml("<script>alert(1)</script>"), `${EXPECT_LT_SCRIPT}alert(1)${EXPECT_GT_SCRIPT}`);
assert.equal(escapeHtml("a & b"), `a ${E("amp")} b`);
assert.equal(
  escapeHtml('"><img src=x onerror=alert(1)>'),
  E("quot") + E("gt") + E("lt") + "img src=x onerror=alert(1)" + E("gt"),
);
assert.equal(escapeHtml("it's"), `it${E("#039")}s`);
assert.equal(escapeHtml(123), "123");
assert.equal(escapeHtml(null), "null");

// --- metric：label / value / hint 全部按纯文本转义 ---
const injected = "<img src=x onerror=alert(1)>";
const metricHtml = metric("当前 DPS", "12.34", `6 把 ${injected}`);
assert.ok(!metricHtml.includes("<img"), "metric hint 不允许透传原始 HTML");
assert.ok(metricHtml.includes(E("lt") + "img"), "metric hint 必须转义");
assert.ok(metricHtml.includes("6 把 "), "metric hint 保留纯文本内容");

const metricValueHtml = metric("label <script>alert(1)</script>", "<script>alert(1)</script>");
assert.ok(!metricValueHtml.includes("<script>"), "metric label/value 必须转义");
assert.ok(metricValueHtml.includes(EXPECT_LT_SCRIPT), "metric label/value 转义为实体");

// --- metricDelta：样式类来自固定集合，数值仍按纯文本转义 ---
const deltaNeg = metricDelta("DPS 变化", "-12.34", "-5%", { positive: false });
assert.ok(deltaNeg.includes('class="negative"'), "负向变化使用 negative 类");
assert.ok(!deltaNeg.includes("<script>"), "metricDelta 不允许透传 HTML");
const deltaPos = metricDelta("DPS 变化", "+12.34", "+5%", { positive: true });
assert.ok(deltaPos.includes('class="positive"'), "正向变化使用 positive 类");
const deltaEscaped = metricDelta("DPS 变化", `<script>alert(1)</script>`, "", { positive: true });
assert.ok(!deltaEscaped.includes("<script>"), "metricDelta value 必须转义");

// --- renderList / renderPills：元素按纯文本转义 ---
const listHtml = renderList(["<script>alert(1)</script>", "正常条目"]);
assert.ok(!listHtml.includes("<script>"), "renderList 不允许透传 HTML");
assert.ok(listHtml.includes(EXPECT_LT_SCRIPT), "renderList 元素转义为实体");
assert.ok(listHtml.includes("正常条目"), "renderList 保留纯文本条目");
assert.equal(renderList([]).includes("<li>"), false, "空列表不产生 li");

const pillsHtml = renderPills(["<b>x</b>", "y"]);
assert.ok(!pillsHtml.includes("<b>"), "renderPills 不允许透传 HTML");
assert.ok(pillsHtml.includes(E("lt") + "b" + E("gt")), "renderPills 元素转义为实体");
assert.ok(renderPills([]).includes("无"), "空 pills 显示占位");

// --- CSP 检查：页面、部署配置和本地服务器都必须限制脚本来源 ---
const indexHtml = readFileSync(join(rootDir, "index.html"), "utf8");
assert.ok(indexHtml.includes("Content-Security-Policy"), "index.html 必须声明 CSP");
assert.ok(indexHtml.includes("script-src 'self'"), "CSP 必须把脚本限制为同源");
assert.ok(!indexHtml.includes("unsafe-inline"), "CSP 不允许 unsafe-inline");

const vercelConfig = JSON.parse(readFileSync(join(rootDir, "vercel.json"), "utf8"));
const cspEntries = (vercelConfig.headers ?? []).flatMap((entry) => entry.headers ?? []);
const cspHeader = cspEntries.find((item) => item.key === "Content-Security-Policy");
assert.ok(cspHeader, "vercel.json 必须配置 CSP 响应头");
assert.ok(cspHeader.value.includes("script-src 'self'"), "部署 CSP 必须限制脚本为同源");

const devServerSource = readFileSync(join(rootDir, "scripts/dev-server.mjs"), "utf8");
assert.ok(devServerSource.includes('"127.0.0.1"'), "开发服务器必须绑定回环地址");
assert.ok(devServerSource.includes("Content-Security-Policy"), "开发服务器必须发送 CSP 响应头");

console.log("Render security tests passed");