import {
  DEFAULT_ITEM_DELTA,
  DEFAULT_STATS,
  DEFAULT_WEAPON,
  DAMAGE_TYPES,
  compareItem,
} from "./calculator.js";

const statLabels = {
  damagePercent: "总伤害 %",
  attackSpeed: "攻速 %",
  critChance: "暴击率 %",
  meleeDamage: "近战伤害",
  rangedDamage: "远程伤害",
  elementalDamage: "元素伤害",
  engineering: "工程学",
};

const scalingLabels = {
  meleeDamage: "近战缩放 %",
  rangedDamage: "远程缩放 %",
  elementalDamage: "元素缩放 %",
  engineering: "工程缩放 %",
};

const weaponLabels = {
  name: "武器名",
  quantity: "武器数量",
  baseDamage: "基础伤害",
  cooldown: "基础冷却 秒",
  hitsPerAttack: "每次命中数",
  critChance: "武器暴击率 %",
  critMultiplier: "暴击倍率",
};

const state = {
  stats: { ...DEFAULT_STATS },
  weapon: structuredClone(DEFAULT_WEAPON),
  itemDelta: { ...DEFAULT_ITEM_DELTA },
  roundingMode: "none",
};

const $ = (selector) => document.querySelector(selector);

function formatNumber(value, digits = 2) {
  const number = Number(value);
  if (!Number.isFinite(number)) return "0";
  return number.toLocaleString("zh-CN", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function createNumberField({ label, value, onInput, step = "1" }) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";

  const span = document.createElement("span");
  span.textContent = label;

  const input = document.createElement("input");
  input.type = "number";
  input.step = step;
  input.value = value;
  input.addEventListener("input", () => onInput(Number(input.value)));

  wrapper.append(span, input);
  return wrapper;
}

function createTextField({ label, value, onInput }) {
  const wrapper = document.createElement("label");
  wrapper.className = "field";

  const span = document.createElement("span");
  span.textContent = label;

  const input = document.createElement("input");
  input.type = "text";
  input.value = value;
  input.addEventListener("input", () => onInput(input.value));

  wrapper.append(span, input);
  return wrapper;
}

function renderStatFields() {
  const root = $("#stats-fields");
  root.replaceChildren();

  Object.entries(statLabels).forEach(([key, label]) => {
    root.append(
      createNumberField({
        label,
        value: state.stats[key],
        onInput: (value) => {
          state.stats[key] = value;
          renderResults();
        },
      }),
    );
  });
}

function renderWeaponFields() {
  const root = $("#weapon-fields");
  root.replaceChildren();

  root.append(
    createTextField({
      label: weaponLabels.name,
      value: state.weapon.name,
      onInput: (value) => {
        state.weapon.name = value;
        renderResults();
      },
    }),
  );

  [
    ["quantity", "1"],
    ["baseDamage", "1"],
    ["cooldown", "0.01"],
    ["hitsPerAttack", "1"],
    ["critChance", "1"],
    ["critMultiplier", "0.1"],
  ].forEach(([key, step]) => {
    root.append(
      createNumberField({
        label: weaponLabels[key],
        value: state.weapon[key],
        step,
        onInput: (value) => {
          state.weapon[key] = value;
          renderResults();
        },
      }),
    );
  });

  DAMAGE_TYPES.forEach((key) => {
    root.append(
      createNumberField({
        label: scalingLabels[key],
        value: state.weapon.scaling[key],
        onInput: (value) => {
          state.weapon.scaling[key] = value;
          renderResults();
        },
      }),
    );
  });
}

function renderItemFields() {
  const root = $("#item-fields");
  root.replaceChildren();

  Object.entries(statLabels).forEach(([key, label]) => {
    root.append(
      createNumberField({
        label: `${label} 变化`,
        value: state.itemDelta[key],
        onInput: (value) => {
          state.itemDelta[key] = value;
          renderResults();
        },
      }),
    );
  });
}

function metric(label, value, hint = "") {
  return `
    <div class="metric">
      <span>${label}</span>
      <strong>${value}</strong>
      ${hint ? `<small>${hint}</small>` : ""}
    </div>
  `;
}

function breakdownRows(result) {
  const rows = [
    ["基础伤害", result.scaledDamage.baseDamage],
    ["近战缩放贡献", result.scaledDamage.scalingParts.meleeDamage],
    ["远程缩放贡献", result.scaledDamage.scalingParts.rangedDamage],
    ["元素缩放贡献", result.scaledDamage.scalingParts.elementalDamage],
    ["工程缩放贡献", result.scaledDamage.scalingParts.engineering],
    ["缩放后伤害", result.scaledDamage.raw],
    ["总伤害倍率", result.damageMultiplier],
    ["总暴击率", result.totalCritChance * 100],
    ["攻速倍率", result.speedMultiplier],
  ];

  return rows
    .map(
      ([label, value]) => `
        <tr>
          <th>${label}</th>
          <td>${formatNumber(value)}</td>
        </tr>
      `,
    )
    .join("");
}

function renderResults() {
  const comparison = compareItem(state.stats, state.weapon, state.itemDelta, {
    roundingMode: state.roundingMode,
  });
  const { before, after } = comparison;
  const deltaClass = comparison.dpsDelta >= 0 ? "positive" : "negative";

  $("#summary").innerHTML = `
    ${metric("当前 DPS", formatNumber(before.dps), `${before.weapon.quantity} 把 ${before.weapon.name}`)}
    ${metric("购买后 DPS", formatNumber(after.dps), "应用候选道具变化")}
    ${metric(
      "DPS 变化",
      `<span class="${deltaClass}">${comparison.dpsDelta >= 0 ? "+" : ""}${formatNumber(comparison.dpsDelta)}</span>`,
      `${comparison.dpsDelta >= 0 ? "+" : ""}${formatNumber(comparison.dpsDeltaPercent)}%`,
    )}
  `;

  $("#details").innerHTML = `
    <section>
      <h3>购买前</h3>
      <div class="mini-grid">
        ${metric("非暴击", formatNumber(before.nonCritDamage))}
        ${metric("暴击", formatNumber(before.critDamage))}
        ${metric("单次期望", formatNumber(before.expectedDamage))}
        ${metric("攻击间隔", `${formatNumber(before.attackInterval, 3)}s`)}
      </div>
      <table>
        <tbody>${breakdownRows(before)}</tbody>
      </table>
    </section>
    <section>
      <h3>购买后</h3>
      <div class="mini-grid">
        ${metric("非暴击", formatNumber(after.nonCritDamage))}
        ${metric("暴击", formatNumber(after.critDamage))}
        ${metric("单次期望", formatNumber(after.expectedDamage))}
        ${metric("攻击间隔", `${formatNumber(after.attackInterval, 3)}s`)}
      </div>
      <table>
        <tbody>${breakdownRows(after)}</tbody>
      </table>
    </section>
  `;
}

function bindControls() {
  $("#rounding-mode").addEventListener("change", (event) => {
    state.roundingMode = event.target.value;
    renderResults();
  });

  $("#reset-item").addEventListener("click", () => {
    state.itemDelta = { ...DEFAULT_ITEM_DELTA };
    renderItemFields();
    renderResults();
  });

  $("#load-example").addEventListener("click", () => {
    state.stats = {
      damagePercent: 25,
      attackSpeed: 30,
      critChance: 15,
      meleeDamage: 12,
      rangedDamage: 0,
      elementalDamage: 0,
      engineering: 0,
    };
    state.weapon = {
      name: "示例近战武器",
      quantity: 6,
      baseDamage: 20,
      cooldown: 0.9,
      hitsPerAttack: 1,
      critChance: 3,
      critMultiplier: 2,
      scaling: {
        meleeDamage: 80,
        rangedDamage: 0,
        elementalDamage: 0,
        engineering: 0,
      },
    };
    state.itemDelta = {
      damagePercent: 5,
      attackSpeed: 0,
      critChance: 0,
      meleeDamage: 3,
      rangedDamage: 0,
      elementalDamage: 0,
      engineering: 0,
    };
    render();
  });
}

function render() {
  renderStatFields();
  renderWeaponFields();
  renderItemFields();
  renderResults();
}

bindControls();
render();
