import {
  DEFAULT_ITEM_DELTA,
  DEFAULT_STATS,
  DEFAULT_WEAPON,
  DAMAGE_TYPES,
  compareItem,
} from "./calculator.js";
import { calculateScenarioDps } from "./scenarioCalculator.js";
import {
  DEFAULT_COMBAT_CONTEXT,
  getAvailableItemEffects,
  getAvailableScenarios,
} from "./scenarioData.js";
import {
  generateStrategyGuide,
  getAvailableCharacters,
  getAvailableDangerLevels,
  getAvailableDlcOptions,
  getAvailableModes,
  getAvailablePreferences,
  getAvailableUnlockOptions,
} from "./strategyGenerator.js";

const statLabels = {
  maxHp: "最大生命",
  hpRegen: "生命再生",
  lifeSteal: "生命窃取 %",
  armor: "护甲",
  dodge: "闪避 %",
  damagePercent: "总伤害 %",
  attackSpeed: "攻速 %",
  critChance: "暴击率 %",
  meleeDamage: "近战伤害",
  rangedDamage: "远程伤害",
  elementalDamage: "元素伤害",
  engineering: "工程学",
  speed: "移速 %",
  harvesting: "收获",
  luck: "幸运",
};

const combatContextLabels = {
  enemyArmor: "敌人护甲",
  averageEnemyHp: "平均敌人血量（0 用场景默认）",
  positioningHitLoss: "走位命中损失 %",
  burnBaseDamage: "燃烧基础每跳伤害",
  burnElementalScaling: "燃烧元素缩放 %",
  burnApplicationChance: "燃烧施加概率 %",
  burnDuration: "燃烧持续 秒",
  burnTickRate: "燃烧每秒跳数",
  burnSpreadChance: "燃烧传播概率 %",
  burnSpreadTargets: "传播额外目标",
  curseIntensity: "诅咒强度",
  curseEnemyPowerPerPoint: "每点诅咒敌人增强 %",
  curseRewardPerPoint: "每点诅咒奖励增强 %",
  structureCount: "结构物数量",
  structureBaseDamage: "结构物基础伤害",
  structureCooldown: "结构物冷却 秒",
  structureEngineeringScaling: "结构物工程缩放 %",
  structureUptime: "结构物有效时间 %",
  structureHitChance: "结构物命中率 %",
  structureTargets: "结构物目标数",
  speedAvoidancePerPoint: "每点移速规避 %",
  speedAvoidanceCap: "移速规避上限 %",
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
  piercing: "穿透次数",
  piercingDamageMultiplier: "穿透伤害保留",
  bounces: "弹射次数",
  bounceDamageMultiplier: "弹射伤害保留",
  explosionTargets: "爆炸额外目标",
  explosionDamageMultiplier: "爆炸伤害倍率",
  critChance: "武器暴击率 %",
  critMultiplier: "暴击倍率",
};

const state = {
  stats: { ...DEFAULT_STATS },
  weapon: structuredClone(DEFAULT_WEAPON),
  itemDelta: { ...DEFAULT_ITEM_DELTA },
  roundingMode: "none",
  scenarioId: "normalWave",
  itemEffectId: "none",
  combatContext: { ...DEFAULT_COMBAT_CONTEXT },
  strategyCharacter: "ranger",
  strategyMode: "normal20",
  strategyDanger: "danger0",
  strategyDlc: "allowDlc",
  strategyUnlock: "allowUnlocks",
  strategyPreference: "stable",
  officialCatalog: null,
  catalogLoadState: "loading",
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

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
    ["piercing", "1"],
    ["piercingDamageMultiplier", "0.05"],
    ["bounces", "1"],
    ["bounceDamageMultiplier", "0.05"],
    ["explosionTargets", "1"],
    ["explosionDamageMultiplier", "0.05"],
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

function renderScenarioFields() {
  const root = $("#scenario-fields");
  root.replaceChildren();

  const scenarioField = document.createElement("label");
  scenarioField.className = "field";
  const scenarioLabel = document.createElement("span");
  scenarioLabel.textContent = "场景预设";
  const scenarioSelect = document.createElement("select");
  scenarioSelect.id = "scenario-select";
  scenarioSelect.append(
    ...getAvailableScenarios().map((scenario) => {
      const option = document.createElement("option");
      option.value = scenario.id;
      option.textContent = `${scenario.name}（${scenario.densityLabel}）`;
      return option;
    }),
  );
  scenarioSelect.value = state.scenarioId;
  scenarioSelect.addEventListener("change", () => {
    state.scenarioId = scenarioSelect.value;
    renderResults();
  });
  scenarioField.append(scenarioLabel, scenarioSelect);

  const itemEffectField = document.createElement("label");
  itemEffectField.className = "field";
  const itemEffectLabel = document.createElement("span");
  itemEffectLabel.textContent = "特殊道具触发";
  const itemEffectSelect = document.createElement("select");
  itemEffectSelect.id = "item-effect-select";
  itemEffectSelect.append(
    ...getAvailableItemEffects().map((itemEffect) => {
      const option = document.createElement("option");
      option.value = itemEffect.id;
      option.textContent = `${itemEffect.name}（${itemEffect.cnName}）`;
      return option;
    }),
  );
  itemEffectSelect.value = state.itemEffectId;
  itemEffectSelect.addEventListener("change", () => {
    state.itemEffectId = itemEffectSelect.value;
    renderResults();
  });
  itemEffectField.append(itemEffectLabel, itemEffectSelect);

  const contextTitle = document.createElement("div");
  contextTitle.className = "field-group-title";
  contextTitle.textContent = "高级场景参数";

  const contextFields = document.createElement("div");
  contextFields.className = "fields context-fields";

  Object.entries(combatContextLabels).forEach(([key, label]) => {
    contextFields.append(
      createNumberField({
        label,
        value: state.combatContext[key],
        step: key.includes("Cooldown") || key.includes("Duration") || key.includes("Rate") ? "0.1" : "1",
        onInput: (value) => {
          state.combatContext[key] = value;
          renderResults();
        },
      }),
    );
  });

  root.append(scenarioField, itemEffectField, contextTitle, contextFields);
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

function renderList(items, className = "plain-list") {
  return `
    <ul class="${className}">
      ${items.map((item) => `<li>${item}</li>`).join("")}
    </ul>
  `;
}

function renderPriorityList(title, items) {
  return `
    <div class="priority-block">
      <h4>${title}</h4>
      ${renderList(items.map((item) => escapeHtml(item)))}
    </div>
  `;
}

function renderOfficialMeta(official) {
  if (state.catalogLoadState === "loading") {
    return `<small class="official-meta">官方目录：加载中</small>`;
  }

  if (state.catalogLoadState === "error") {
    return `<small class="official-meta">官方目录：未载入，本地静态文件可继续使用手写资料</small>`;
  }

  return `<small class="official-meta">官方目录：${escapeHtml(official.display)}</small>`;
}

function renderStrategyControls() {
  const characterSelect = $("#strategy-character");
  const modeSelect = $("#strategy-mode");
  const dangerSelect = $("#strategy-danger");
  const dlcSelect = $("#strategy-dlc");
  const unlockSelect = $("#strategy-unlock");
  const preferenceSelect = $("#strategy-preference");

  characterSelect.replaceChildren(
    ...getAvailableCharacters().map((character) => {
      const option = document.createElement("option");
      option.value = character.id;
      option.textContent = `${character.name}（${character.cnHint}）`;
      return option;
    }),
  );
  characterSelect.value = state.strategyCharacter;

  modeSelect.replaceChildren(
    ...getAvailableModes().map((mode) => {
      const option = document.createElement("option");
      option.value = mode.id;
      option.textContent = mode.label;
      return option;
    }),
  );
  modeSelect.value = state.strategyMode;

  dangerSelect.replaceChildren(
    ...getAvailableDangerLevels().map((danger) => {
      const option = document.createElement("option");
      option.value = danger.id;
      option.textContent = danger.label;
      return option;
    }),
  );
  dangerSelect.value = state.strategyDanger;

  dlcSelect.replaceChildren(
    ...getAvailableDlcOptions().map((dlc) => {
      const option = document.createElement("option");
      option.value = dlc.id;
      option.textContent = dlc.label;
      return option;
    }),
  );
  dlcSelect.value = state.strategyDlc;

  unlockSelect.replaceChildren(
    ...getAvailableUnlockOptions().map((unlock) => {
      const option = document.createElement("option");
      option.value = unlock.id;
      option.textContent = unlock.label;
      return option;
    }),
  );
  unlockSelect.value = state.strategyUnlock;

  preferenceSelect.replaceChildren(
    ...getAvailablePreferences().map((preference) => {
      const option = document.createElement("option");
      option.value = preference.id;
      option.textContent = preference.label;
      return option;
    }),
  );
  preferenceSelect.value = state.strategyPreference;
}

function renderStrategyGuide() {
  const guide = generateStrategyGuide(state.strategyCharacter, state.strategyMode, {
    officialCatalog: state.officialCatalog,
    dangerLevelId: state.strategyDanger,
    dlcOptionId: state.strategyDlc,
    unlockOptionId: state.strategyUnlock,
    preferenceId: state.strategyPreference,
  });
  const output = $("#strategy-output");
  const catalogNote =
    state.catalogLoadState === "loaded" && state.officialCatalog
      ? `官方目录已载入：${state.officialCatalog.summary.total} 条记录，原版 ${state.officialCatalog.summary.byPackage.base} 条，深海魔怪 ${state.officialCatalog.summary.byPackage.abyssalTerrors} 条。`
      : "官方目录未载入时，攻略仍使用手写数据；启动本地服务后会自动补全官方元数据。";

  output.innerHTML = `
    <section class="guide-hero">
      <div>
        <p class="eyebrow">${escapeHtml(guide.mode.label)}</p>
        <h3>${escapeHtml(guide.character.name)} <span>${escapeHtml(guide.character.cnHint)}</span></h3>
        <p>${escapeHtml(guide.character.summary)}</p>
      </div>
      <div class="unlock-box">
        <span>角色解锁</span>
        <strong>${escapeHtml(guide.character.unlock)}</strong>
      </div>
    </section>

    <section class="guide-grid">
      <div class="guide-section">
        <h3>推荐武器</h3>
        <div class="card-list">
          ${guide.recommendedWeapons
            .map(
              ({ priority, reason, weapon, official, recommendationScore, recommendationReasons }) => `
                <article class="guide-card">
                  <div>
                    <span>${escapeHtml(priority)}</span>
                    <h4>${escapeHtml(weapon.name)} <small>（${escapeHtml(weapon.cnName)}，${escapeHtml(weapon.type)}）</small></h4>
                  </div>
                  <p>${escapeHtml(reason)}</p>
                  <small>推荐评分：${escapeHtml(String(recommendationScore ?? 0))}${recommendationReasons?.length ? `；${escapeHtml(recommendationReasons.join("；"))}` : ""}</small>
                  <small>属性：${escapeHtml(weapon.statNote)}</small>
                  ${weapon.setNote ? `<small>套装：${escapeHtml(weapon.setNote)}</small>` : ""}
                  <small>解锁：${escapeHtml(weapon.unlock)}</small>
                  ${renderOfficialMeta(official)}
                </article>
              `,
            )
            .join("")}
        </div>
        <p class="avoid-line"><strong>避免：</strong>${escapeHtml(guide.avoid)}</p>
      </div>

      <div class="guide-section">
        <h3>关键道具</h3>
        <div class="card-list">
          ${guide.keyItems
            .map(
              ({ priority, reason, item, official, recommendationScore, recommendationReasons }) => `
                <article class="guide-card">
                  <div>
                    <span>${escapeHtml(priority)}</span>
                    <h4>${escapeHtml(item.name)} <small>（${escapeHtml(item.cnName)}，${escapeHtml(item.role)}）</small></h4>
                  </div>
                  <p>${escapeHtml(reason)}</p>
                  <small>推荐评分：${escapeHtml(String(recommendationScore ?? 0))}${recommendationReasons?.length ? `；${escapeHtml(recommendationReasons.join("；"))}` : ""}</small>
                  <small>属性：${escapeHtml(item.statNote)}</small>
                  <small>解锁：${escapeHtml(item.unlock)}</small>
                  ${renderOfficialMeta(official)}
                </article>
              `,
            )
            .join("")}
        </div>
      </div>

      <div class="guide-section">
        <h3>属性优先级</h3>
        <div class="priority-grid">
          ${renderPriorityList("前期", guide.statPriority.early)}
          ${renderPriorityList("中期", guide.statPriority.mid)}
          ${renderPriorityList("后期", guide.statPriority.late)}
        </div>
      </div>

      <div class="guide-section">
        <h3>购物和升级节奏</h3>
        ${renderList(guide.rhythm.map((item) => escapeHtml(item)))}
      </div>
    </section>

    <section class="target-section">
      <h3>推荐第 20 关目标面板</h3>
      <div class="target-grid">
        ${guide.wave20Targets
          .map(
            ({ label, value }) => `
              <div class="target-chip">
                <span>${escapeHtml(label)}</span>
                <strong>${escapeHtml(value)}</strong>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>

    <section class="source-section">
      <h3>资料状态</h3>
      ${renderList([...guide.optionNotes, ...guide.sourceNotes, catalogNote].map((item) => escapeHtml(item)))}
    </section>
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

function formatScenarioCell(value, kind = "number") {
  if (typeof value !== "number") return escapeHtml(value);
  if (kind === "percent") return `${formatNumber(value * 100)}%`;
  if (kind === "multiplier") return `${formatNumber(value)}x`;
  return formatNumber(value);
}

function scenarioRows(result) {
  const burning = result.burning ?? { dps: 0, uptime: 0 };
  const structures = result.structures ?? { dps: 0 };
  const curse = result.curse ?? { enemyPowerMultiplier: 1, rewardMultiplier: 1 };
  const survival = result.survival ?? {
    effectiveAvoidance: 0,
    incomingDamageMultiplier: 1,
  };
  const rows = [
    ["场景", result.scenario.name],
    ["原始武器 DPS", result.rawScenarioWeaponDps ?? result.scenarioWeaponDps],
    ["护甲后倍率", result.enemyArmorMultiplier ?? 1, "multiplier"],
    ["溢出伤害损失", result.overflowLoss ?? 0, "percent"],
    ["走位命中损失", result.positioningHitLoss ?? 0, "percent"],
    ["有效武器 DPS", result.scenarioWeaponDps],
    ["穿透贡献", result.piercingDps],
    ["弹射贡献", result.bounceDps],
    ["爆炸贡献", result.explosionDps],
    ["燃烧贡献", burning.dps],
    ["燃烧覆盖率", burning.uptime, "percent"],
    ["结构物贡献", structures.dps],
    [`${result.itemEffect.itemEffect.name} 贡献`, result.itemEffect.dps],
    ["诅咒敌人强度", curse.enemyPowerMultiplier, "multiplier"],
    ["诅咒奖励倍率", curse.rewardMultiplier, "multiplier"],
    ["有效规避率", survival.effectiveAvoidance, "percent"],
    ["承伤倍率", survival.incomingDamageMultiplier, "multiplier"],
    ["场景总 DPS", result.totalDps],
    ["奖励修正清场评分", result.effectiveClearScore ?? result.totalDps],
  ];

  return rows
    .map(
      ([label, value, kind]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${formatScenarioCell(value, kind)}</td>
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
  const scenarioBefore = calculateScenarioDps(
    state.stats,
    state.weapon,
    state.scenarioId,
    state.itemEffectId,
    {
      roundingMode: state.roundingMode,
      combatContext: state.combatContext,
    },
  );
  const scenarioAfter = calculateScenarioDps(
    comparison.afterStats,
    state.weapon,
    state.scenarioId,
    state.itemEffectId,
    {
      roundingMode: state.roundingMode,
      combatContext: state.combatContext,
    },
  );
  const scenarioDelta = scenarioAfter.totalDps - scenarioBefore.totalDps;
  const scenarioDeltaPercent =
    scenarioBefore.totalDps === 0
      ? 0
      : (scenarioDelta / scenarioBefore.totalDps) * 100;
  const deltaClass = comparison.dpsDelta >= 0 ? "positive" : "negative";
  const scenarioDeltaClass = scenarioDelta >= 0 ? "positive" : "negative";

  $("#summary").innerHTML = `
    ${metric("当前 DPS", formatNumber(before.dps), `${before.weapon.quantity} 把 ${before.weapon.name}`)}
    ${metric("当前场景 DPS", formatNumber(scenarioBefore.totalDps), scenarioBefore.scenario.name)}
    ${metric(
      "DPS 变化",
      `<span class="${deltaClass}">${comparison.dpsDelta >= 0 ? "+" : ""}${formatNumber(comparison.dpsDelta)}</span>`,
      `${comparison.dpsDelta >= 0 ? "+" : ""}${formatNumber(comparison.dpsDeltaPercent)}%`,
    )}
    ${metric("购买后 DPS", formatNumber(after.dps), "只含基础命中模型")}
    ${metric("购买后场景 DPS", formatNumber(scenarioAfter.totalDps), "应用候选道具变化")}
    ${metric(
      "场景 DPS 变化",
      `<span class="${scenarioDeltaClass}">${scenarioDelta >= 0 ? "+" : ""}${formatNumber(scenarioDelta)}</span>`,
      `${scenarioDelta >= 0 ? "+" : ""}${formatNumber(scenarioDeltaPercent)}%`,
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
    <section>
      <h3>场景拆分：购买前</h3>
      <table>
        <tbody>${scenarioRows(scenarioBefore)}</tbody>
      </table>
    </section>
    <section>
      <h3>场景拆分：购买后</h3>
      <table>
        <tbody>${scenarioRows(scenarioAfter)}</tbody>
      </table>
    </section>
  `;
}

function bindControls() {
  $("#strategy-character").addEventListener("change", (event) => {
    state.strategyCharacter = event.target.value;
    renderStrategyGuide();
  });

  $("#strategy-mode").addEventListener("change", (event) => {
    state.strategyMode = event.target.value;
    renderStrategyGuide();
  });

  $("#strategy-danger").addEventListener("change", (event) => {
    state.strategyDanger = event.target.value;
    renderStrategyGuide();
  });

  $("#strategy-dlc").addEventListener("change", (event) => {
    state.strategyDlc = event.target.value;
    renderStrategyGuide();
  });

  $("#strategy-unlock").addEventListener("change", (event) => {
    state.strategyUnlock = event.target.value;
    renderStrategyGuide();
  });

  $("#strategy-preference").addEventListener("change", (event) => {
    state.strategyPreference = event.target.value;
    renderStrategyGuide();
  });

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
      maxHp: 65,
      hpRegen: 0,
      lifeSteal: 8,
      armor: 8,
      dodge: 15,
      damagePercent: 40,
      attackSpeed: 60,
      critChance: 15,
      meleeDamage: 0,
      rangedDamage: 45,
      elementalDamage: 0,
      engineering: 0,
      speed: 18,
      harvesting: 80,
      luck: 180,
    };
    state.weapon = {
      name: "Slingshot 示例",
      quantity: 6,
      baseDamage: 18,
      cooldown: 0.85,
      hitsPerAttack: 1,
      piercing: 0,
      piercingDamageMultiplier: 0.5,
      bounces: 2,
      bounceDamageMultiplier: 0.5,
      explosionTargets: 0,
      explosionDamageMultiplier: 1,
      critChance: 3,
      critMultiplier: 2,
      scaling: {
        meleeDamage: 0,
        rangedDamage: 80,
        elementalDamage: 0,
        engineering: 0,
      },
    };
    state.itemDelta = {
      maxHp: 0,
      hpRegen: 0,
      lifeSteal: 0,
      armor: 0,
      dodge: 0,
      damagePercent: 0,
      attackSpeed: 0,
      critChance: 0,
      meleeDamage: 0,
      rangedDamage: 0,
      elementalDamage: 0,
      engineering: 0,
      speed: 0,
      harvesting: 0,
      luck: 50,
    };
    state.combatContext = {
      ...DEFAULT_COMBAT_CONTEXT,
      averageEnemyHp: 120,
      positioningHitLoss: 12,
      burnApplicationChance: 0,
      curseIntensity: 20,
    };
    state.scenarioId = "swarm";
    state.itemEffectId = "babyWithABeard";
    state.strategyCharacter = "lucky";
    state.strategyMode = "endless";
    state.strategyDanger = "danger5";
    state.strategyDlc = "allowDlc";
    state.strategyUnlock = "allowUnlocks";
    state.strategyPreference = "ranged";
    render();
  });
}

function render() {
  renderStrategyControls();
  renderStrategyGuide();
  renderStatFields();
  renderWeaponFields();
  renderScenarioFields();
  renderItemFields();
  renderResults();
}

async function loadOfficialCatalog() {
  try {
    const response = await fetch("./data/official-catalog.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.officialCatalog = await response.json();
    state.catalogLoadState = "loaded";
  } catch (error) {
    console.warn("Failed to load official catalog", error);
    state.officialCatalog = null;
    state.catalogLoadState = "error";
  }

  renderStrategyGuide();
}

bindControls();
render();
loadOfficialCatalog();
