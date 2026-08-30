// 纯字符串渲染工具：所有模板参数都按“不可信纯文本”处理，
// 内部统一转义后再进入 HTML 模板，避免混合信任级别造成 DOM 注入。
// 该模块不依赖 DOM，可以在 Node 测试中直接导入。

const AMPERSAND = String.fromCharCode(38);

const HTML_ESCAPES = {
  [AMPERSAND]: AMPERSAND + "amp;",
  "<": AMPERSAND + "lt;",
  ">": AMPERSAND + "gt;",
  '"': AMPERSAND + "quot;",
  "'": AMPERSAND + "#039;",
};

export function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
}

// label / value / hint 全部是纯文本，内部转义。
export function metric(label, value, hint = "") {
  return `
    <div class="metric">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;
}

// 带正负着色的指标：value 是纯文本（如 "+12.34" / "-12.34"），
// 样式类由 positive 参数从固定集合中选择，不接受外部 HTML。
export function metricDelta(label, value, hint = "", { positive = true } = {}) {
  const deltaClass = positive ? "positive" : "negative";
  return `
    <div class="metric">
      <span>${escapeHtml(label)}</span>
      <strong><span class="${deltaClass}">${escapeHtml(value)}</span></strong>
      ${hint ? `<small>${escapeHtml(hint)}</small>` : ""}
    </div>
  `;
}

// items 是纯文本数组，内部转义。
export function renderList(items, className = "plain-list") {
  const safeItems = Array.isArray(items) ? items : [];
  return `
    <ul class="${className}">
      ${safeItems.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}
    </ul>
  `;
}

export function renderPills(items) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!safeItems.length) return `<span class="pill muted-pill">无</span>`;
  return safeItems.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("");
}