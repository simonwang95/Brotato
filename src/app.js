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
import { buildCompendium } from "./compendium.js";
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
  simulatorCharacter: "ranger",
  officialCatalog: null,
  catalogLoadState: "loading",
  officialLocalization: null,
  localizationLoadState: "loading",
  activePage: "guide",
  compendiumPage: "overview",
  compendiumTab: "characters",
  compendiumSearch: "",
  compendiumSearchDraft: "",
  screenshotParse: {
    status: "idle",
    message: "",
    rawText: "",
    parsed: null,
  },
};

const compendiumTabs = {
  characters: {
    title: "角色",
    description: "查看全角色中文名、流派定位、攻略摘要和解锁条件维护状态。",
  },
  weapons: {
    title: "武器",
    description: "查看全武器中文名、价格区间、阶级、套装、掉落状态和策略属性说明。",
  },
  items: {
    title: "物品",
    description: "查看全物品中文名、价格、阶级、掉落/解锁状态和策略属性说明。",
  },
};

const compendiumTabIds = Object.keys(compendiumTabs);
const pageIds = ["compendium", "guide", "simulator"];

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

function renderPills(items) {
  if (!items.length) return `<span class="pill muted-pill">无</span>`;
  return items.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("");
}

function renderCompendiumImage(entry, label) {
  if (entry.imageAssetPath) {
    return `
      <div class="compendium-thumb">
        <img src="${escapeHtml(entry.imageAssetPath)}" alt="${escapeHtml(label)}" loading="lazy" />
      </div>
    `;
  }

  const fallback = (entry.cnName || entry.name || entry.enName || "?").slice(0, 1);
  return `<div class="compendium-thumb compendium-thumb-placeholder" aria-hidden="true">${escapeHtml(fallback)}</div>`;
}

function firstOfficialImagePath(official) {
  return official?.records?.find((record) => record.imageAssetPath)?.imageAssetPath ?? null;
}

function compendiumDetailHref(kind, query) {
  const tab = kind === "weapon" ? "weapons" : "items";
  return `#compendium/${tab}?q=${encodeURIComponent(query)}`;
}

function renderGuideEntryImage(kind, official, label, query = label) {
  const imagePath = firstOfficialImagePath(official);
  if (imagePath) {
    return `
      <a class="guide-entry-thumb" href="${escapeHtml(compendiumDetailHref(kind, query))}" aria-label="在图鉴中查看 ${escapeHtml(label)}">
        <img src="${escapeHtml(imagePath)}" alt="${escapeHtml(label)}" loading="lazy" />
      </a>
    `;
  }

  return `<span class="guide-entry-thumb guide-entry-thumb-placeholder" aria-hidden="true">${escapeHtml(label.slice(0, 1))}</span>`;
}

function renderGuideCatalogLink(kind, title, cnName, subtitle, official) {
  const query = cnName || title;
  const href = compendiumDetailHref(kind, query);
  return `
    <div class="guide-card-title">
      ${renderGuideEntryImage(kind, official, `${cnName || title} ${title}`, query)}
      <div>
        <span>${escapeHtml(subtitle.priority)}</span>
        <h4>
          <a href="${escapeHtml(href)}">${escapeHtml(title)}</a>
          <small>（${escapeHtml(cnName)}，${escapeHtml(subtitle.type)}）</small>
        </h4>
      </div>
    </div>
  `;
}

function renderPageShell() {
  document.querySelectorAll("[data-page]").forEach((section) => {
    section.hidden = section.dataset.page !== state.activePage;
  });

  document.querySelectorAll("[data-page-link]").forEach((link) => {
    const isActive = link.dataset.pageLink === state.activePage;
    link.classList.toggle("active", isActive);
    link.setAttribute("aria-current", isActive ? "page" : "false");
  });
}

function routePageFromHash(hash) {
  if (hash.startsWith("#guide")) return "guide";
  if (hash.startsWith("#simulator")) return "simulator";
  return "compendium";
}

function matchesCompendiumSearch(row, query) {
  if (!query) return true;
  const haystack = [
    row.name,
    row.enName,
    row.cnName,
    row.archetype,
    row.nameKey,
    row.summary,
    row.unlock,
    ...(row.traits ?? []),
    row.strategyUnlock,
    row.strategyStatNote,
    row.strategyType,
    ...(row.detailedAttributes ?? []),
    ...(row.weaponTierRows ?? []).flatMap((tier) => Object.values(tier)),
    ...(row.tierEffectLines ?? []),
    ...(row.strategyTags ?? []),
    ...(row.setLabels ?? []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderCharacterCompendiumCard(character) {
  return `
    <article class="compendium-card">
      <div class="compendium-card-top">
        ${renderCompendiumImage(character, `${character.cnName} ${character.name}`)}
        <div class="compendium-card-header">
          <span>${escapeHtml(`${character.unlockStatus} · ${character.sourceLabel}`)}</span>
          <h4>${escapeHtml(character.name)} <small>（${escapeHtml(character.cnName)}${character.archetype ? `，${escapeHtml(character.archetype)}` : ""}）</small></h4>
        </div>
      </div>
      <p>${escapeHtml(character.summary)}</p>
      <dl class="compendium-meta">
        <div><dt>角色特性</dt><dd>${character.traits.length ? renderList(character.traits.map((line) => escapeHtml(line)), "compact-list") : "未匹配到官方数值特性"}</dd></div>
        <div><dt>解锁</dt><dd>${escapeHtml(character.unlock)}</dd></div>
      </dl>
    </article>
  `;
}

function renderWeaponTierTable(entry) {
  if (!entry.weaponTierRows?.length) {
    return renderList(entry.detailedAttributes.map((line) => escapeHtml(line)), "compact-list");
  }

  return `
    <div class="weapon-tier-table-wrap">
      <table class="weapon-tier-table">
        <thead>
          <tr>
            <th>等级</th>
            <th>价格</th>
            <th>伤害</th>
            <th>冷却</th>
            <th>暴击</th>
            <th>范围</th>
            <th>击退</th>
            <th>缩放</th>
            <th>投射</th>
            <th>穿透/保留</th>
            <th>弹射/保留</th>
          </tr>
        </thead>
        <tbody>
          ${entry.weaponTierRows
            .map(
              (row) => `
                <tr>
                  <th>${escapeHtml(row.tier)}</th>
                  <td>${escapeHtml(row.price || "-")}</td>
                  <td>${escapeHtml(row.damage || "-")}</td>
                  <td>${escapeHtml(row.cooldown || "-")}</td>
                  <td>${escapeHtml(row.crit || "-")}</td>
                  <td>${escapeHtml(row.range || "-")}</td>
                  <td>${escapeHtml(row.knockback || "-")}</td>
                  <td>${escapeHtml(row.scaling || "-")}</td>
                  <td>${escapeHtml(row.projectiles || "-")}</td>
                  <td>${escapeHtml(row.piercing || "-")}</td>
                  <td>${escapeHtml(row.bounce || "-")}</td>
                </tr>
              `,
            )
            .join("")}
        </tbody>
      </table>
    </div>
    ${
      entry.tierEffectLines?.length
        ? `<div class="tier-effect-block"><span>等级效果</span>${renderList(entry.tierEffectLines.map((line) => escapeHtml(line)), "compact-list")}</div>`
        : ""
    }
  `;
}

function renderCatalogCompendiumCard(entry, kindLabel) {
  const tags = [
    entry.strategyType,
    ...entry.strategyTags,
    `${entry.effectCount} 个效果资源`,
    entry.isCursedLabel,
  ].filter(Boolean);

  return `
    <article class="compendium-card">
      <div class="compendium-card-top">
        ${renderCompendiumImage(entry, `${entry.cnName} ${entry.enName}`)}
        <div class="compendium-card-header">
          <span>${escapeHtml(kindLabel)} · ${escapeHtml(entry.sourceLabel)}</span>
          <h4>${escapeHtml(entry.enName)} <small>（${escapeHtml(entry.cnName)}）</small></h4>
        </div>
      </div>
      <div class="compendium-stats">
        <div><span>价格</span><strong>${escapeHtml(entry.valueLabel)}</strong></div>
        <div><span>阶级</span><strong>${escapeHtml(entry.tierLabel)}</strong></div>
        <div><span>记录</span><strong>${escapeHtml(String(entry.recordCount))}</strong></div>
      </div>
      <dl class="compendium-meta">
        <div><dt>官方状态</dt><dd>${escapeHtml(`${entry.unlockLabel}，${entry.lootLabel}`)}</dd></div>
        <div><dt>策略解锁</dt><dd>${escapeHtml(entry.strategyUnlock)}</dd></div>
        <div><dt>详细属性</dt><dd>${entry.weaponTierRows?.length ? renderWeaponTierTable(entry) : renderList(entry.detailedAttributes.map((line) => escapeHtml(line)), "compact-list")}</dd></div>
        <div><dt>功能说明</dt><dd>${escapeHtml(entry.strategyStatNote || "待补策略说明")}</dd></div>
        <div><dt>套装</dt><dd class="pill-list">${renderPills(entry.setLabels)}</dd></div>
        <div><dt>标签</dt><dd class="pill-list">${renderPills(tags)}</dd></div>
      </dl>
    </article>
  `;
}

function renderCompendiumTabs() {
  $(".compendium-panel")?.classList.toggle(
    "compendium-overview-mode",
    state.compendiumPage === "overview",
  );

  document.querySelectorAll("[data-compendium-home]").forEach((button) => {
    const isActive = state.compendiumPage === "overview";
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });

  document.querySelectorAll("[data-compendium-tab]").forEach((button) => {
    const isActive =
      state.compendiumPage === "detail" && button.dataset.compendiumTab === state.compendiumTab;
    button.classList.toggle("active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
}

function applyCompendiumSearch() {
  state.compendiumSearch = state.compendiumSearchDraft.trim();
  renderCompendium();
}

function clearCompendiumSearchState() {
  state.compendiumSearch = "";
  state.compendiumSearchDraft = "";
  const searchInput = $("#compendium-search");
  if (searchInput) searchInput.value = "";
}

function syncCompendiumRoute() {
  const [, tabId] = window.location.hash.match(/^#compendium\/([^?]+)/) ?? [];
  const query = window.location.hash.match(/[?&]q=([^&]+)/)?.[1];
  const previousPage = state.compendiumPage;
  const previousTab = state.compendiumTab;

  if (compendiumTabIds.includes(tabId)) {
    state.compendiumPage = "detail";
    state.compendiumTab = tabId;
    if (query !== undefined) {
      state.compendiumSearch = decodeURIComponent(query);
      state.compendiumSearchDraft = state.compendiumSearch;
      const searchInput = $("#compendium-search");
      if (searchInput) searchInput.value = state.compendiumSearch;
    } else if (previousPage !== "detail" || previousTab !== tabId) {
      clearCompendiumSearchState();
    }
  } else if (window.location.hash === "#compendium") {
    state.compendiumPage = "overview";
  }
}

function syncAppRoute() {
  if (!window.location.hash) {
    window.history.replaceState(null, "", "#guide");
  }

  state.activePage = routePageFromHash(window.location.hash);
  if (!pageIds.includes(state.activePage)) state.activePage = "compendium";
  if (state.activePage === "compendium") {
    syncCompendiumRoute();
  }

  renderPageShell();
  renderCompendium();
  renderStrategyGuide();
  renderScreenshotParseOutput();
}

function renderCompendiumOverview(compendium) {
  const cards = compendiumTabIds
    .map((tabId) => {
      const tab = compendiumTabs[tabId];
      const count = compendium[tabId].length;
      return `
        <article class="compendium-category-card">
          <span>${escapeHtml(String(count))} 条</span>
          <h4>${escapeHtml(tab.title)}图鉴</h4>
          <p>${escapeHtml(tab.description)}</p>
          <a class="button" href="#compendium/${escapeHtml(tabId)}" data-compendium-tab="${escapeHtml(tabId)}">查看全部${escapeHtml(tab.title)}</a>
        </article>
      `;
    })
    .join("");

  return `
    <div class="compendium-summary">
      <strong>图鉴总览</strong>
      <span>角色 ${escapeHtml(String(compendium.characters.length))}</span>
      <span>武器 ${escapeHtml(String(compendium.weapons.length))}</span>
      <span>物品 ${escapeHtml(String(compendium.items.length))}</span>
    </div>
    <div class="compendium-category-grid">${cards}</div>
  `;
}

function renderCompendium() {
  const output = $("#compendium-output");
  if (!output) return;

  renderCompendiumTabs();

  if (state.catalogLoadState === "loading" || state.localizationLoadState === "loading") {
    output.innerHTML = `<div class="empty-state">正在载入官方目录和中文本地化。</div>`;
    return;
  }

  if (state.catalogLoadState === "error") {
    output.innerHTML = `<div class="empty-state">官方目录未载入，暂时无法展示武器/物品完整价格图鉴。</div>`;
    return;
  }

  const compendium = buildCompendium(state.officialCatalog, state.officialLocalization);
  const tabConfig = {
    characters: {
      title: compendiumTabs.characters.title,
      rows: compendium.characters,
      render: renderCharacterCompendiumCard,
    },
    weapons: {
      title: compendiumTabs.weapons.title,
      rows: compendium.weapons,
      render: (entry) => renderCatalogCompendiumCard(entry, "武器"),
    },
    items: {
      title: compendiumTabs.items.title,
      rows: compendium.items,
      render: (entry) => renderCatalogCompendiumCard(entry, "物品"),
    },
  };

  if (state.compendiumPage === "overview") {
    output.innerHTML = renderCompendiumOverview(compendium);
    return;
  }

  const active = tabConfig[state.compendiumTab] ?? tabConfig.characters;
  const query = state.compendiumSearch.trim();
  const rows = active.rows.filter((row) => matchesCompendiumSearch(row, query));

  output.innerHTML = `
    <div class="compendium-page-actions">
      <a class="button secondary" href="#compendium" data-compendium-home>返回总览</a>
    </div>
    <div class="compendium-summary">
      <strong>${escapeHtml(active.title)}图鉴</strong>
      <span>${escapeHtml(String(rows.length))} / ${escapeHtml(String(active.rows.length))} 条</span>
      <span>武器 ${escapeHtml(String(compendium.weapons.length))}，物品 ${escapeHtml(String(compendium.items.length))}，角色 ${escapeHtml(String(compendium.characters.length))}</span>
    </div>
    ${
      rows.length
        ? `<div class="compendium-grid compendium-grid-${escapeHtml(state.compendiumTab)}">${rows.map((row) => active.render(row)).join("")}</div>`
        : `<div class="empty-state">没有匹配的图鉴条目。</div>`
    }
  `;
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

function renderSimulatorCharacterControl() {
  const characterSelect = $("#simulator-character");
  if (!characterSelect) return;

  characterSelect.replaceChildren(
    ...getAvailableCharacters().map((character) => {
      const option = document.createElement("option");
      option.value = character.id;
      option.textContent = `${character.name}（${character.cnHint}）`;
      return option;
    }),
  );
  characterSelect.value = state.simulatorCharacter;
}

function selectedCharacterCompendiumEntry(characterId) {
  if (state.catalogLoadState !== "loaded" || !state.officialCatalog) return null;
  const compendium = buildCompendium(state.officialCatalog, state.officialLocalization);
  return compendium.characters.find((character) => character.id === characterId) ?? null;
}

function renderGuideCharacterPortrait(character) {
  const compendiumEntry = selectedCharacterCompendiumEntry(character.id);
  const label = `${character.name} ${compendiumEntry?.cnName ?? character.cnHint}`;

  if (compendiumEntry?.imageAssetPath) {
    return `
      <div class="guide-character-portrait">
        <img src="${escapeHtml(compendiumEntry.imageAssetPath)}" alt="${escapeHtml(label)}" loading="lazy" />
      </div>
    `;
  }

  const fallback = (compendiumEntry?.cnName || character.cnHint || character.name || "?").slice(0, 1);
  return `<div class="guide-character-portrait" aria-hidden="true"><span>${escapeHtml(fallback)}</span></div>`;
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
      ${renderGuideCharacterPortrait(guide.character)}
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
                  ${renderGuideCatalogLink("weapon", weapon.name, weapon.cnName, {
                    priority,
                    type: weapon.type,
                  }, official)}
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
                  ${renderGuideCatalogLink("item", item.name, item.cnName, {
                    priority,
                    type: item.role,
                  }, official)}
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

function renderScreenshotParseOutput() {
  const output = $("#screenshot-parse-output");
  if (!output) return;

  const { status, message, rawText, parsed } = state.screenshotParse;
  const statusLabel = {
    idle: "尚未解析",
    loading: "解析中",
    success: "解析完成",
    error: "解析失败",
  }[status];
  const detail = parsed ? JSON.stringify(parsed, null, 2) : rawText;

  output.classList.toggle("empty-state", status === "idle" || status === "error");
  output.innerHTML = `
    <strong>${escapeHtml(statusLabel)}</strong>
    <span>${escapeHtml(message || "上传 Brotato 截图后，会只识别右侧属性栏的属性名和数字。")}</span>
    ${detail ? `<pre>${escapeHtml(detail)}</pre>` : ""}
  `;
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(reader.result));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function parseJsonFromText(text) {
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  const candidate = fenced ?? (start >= 0 && end > start ? text.slice(start, end + 1) : "");
  if (!candidate.trim()) return null;

  try {
    return JSON.parse(candidate);
  } catch {
    return null;
  }
}

function parseOcrStatsFromText(text) {
  if (!text) return null;

  const rows = [];
  const lines = text.split(/\r?\n/);
  const allAliases = {
    level: ["当前等级", "等级", "level"],
    curse: ["诅咒", "curse"],
    ...statAliases,
  };

  Object.entries(allAliases).forEach(([key, aliases]) => {
    const matchedLine = lines.find((line) =>
      aliases.some((alias) => line.toLowerCase().includes(String(alias).toLowerCase())),
    );
    if (!matchedLine) return;

    const quoted = [...matchedLine.matchAll(/["“”'](-?\d+(?:\.\d+)?)["“”']/g)].at(-1)?.[1];
    const numbers = [...matchedLine.matchAll(/(?<![A-Za-z])[-+]?\d+(?:\.\d+)?%?/g)]
      .map((match) => match[0])
      .filter((value) => !/^20\d{2}$/.test(value));
    const rawValue = quoted ?? numbers.at(-1);
    const number = numberOrExisting(rawValue, NaN);
    if (!Number.isFinite(number)) return;

    rows.push({
      key,
      label: aliases[0],
      value: number,
    });
  });

  if (!rows.length) return null;
  return {
    statsOcr: rows.filter((row) => row.key !== "level" && row.key !== "curse"),
    level: rows.find((row) => row.key === "level")?.value,
    curse: rows.find((row) => row.key === "curse")?.value,
  };
}

function numberOrExisting(value, current) {
  const number =
    typeof value === "string"
      ? Number(value.replace(/[%+，,\s]/g, "").match(/-?\d+(?:\.\d+)?/)?.[0])
      : Number(value);
  return Number.isFinite(number) ? number : current;
}

const statAliases = {
  maxHp: ["maxHp", "最大生命值", "最大生命", "生命值", "生命"],
  hpRegen: ["hpRegen", "生命再生", "生命恢复", "回血"],
  lifeSteal: ["lifeSteal", "%生命窃取", "生命窃取", "吸血"],
  armor: ["armor", "护甲"],
  dodge: ["dodge", "%闪避", "闪避"],
  damagePercent: ["damagePercent", "%伤害", "伤害", "总伤害"],
  attackSpeed: ["attackSpeed", "%攻击速度", "攻击速度", "攻速"],
  critChance: ["critChance", "%暴击率", "暴击率", "暴击"],
  meleeDamage: ["meleeDamage", "近战伤害"],
  rangedDamage: ["rangedDamage", "远程伤害"],
  elementalDamage: ["elementalDamage", "元素伤害"],
  engineering: ["engineering", "工程学"],
  speed: ["speed", "%速度", "速度", "移速"],
  harvesting: ["harvesting", "收获"],
  luck: ["luck", "幸运"],
};

const weaponAliases = {
  name: ["name", "武器名", "主要武器", "当前武器"],
  quantity: ["quantity", "数量", "武器数量"],
  baseDamage: ["baseDamage", "基础伤害", "伤害"],
  cooldown: ["cooldown", "冷却", "攻击间隔"],
  hitsPerAttack: ["hitsPerAttack", "每次命中数", "命中数"],
  piercing: ["piercing", "穿透次数", "穿透"],
  piercingDamageMultiplier: ["piercingDamageMultiplier", "穿透伤害保留"],
  bounces: ["bounces", "弹射次数", "弹射"],
  bounceDamageMultiplier: ["bounceDamageMultiplier", "弹射伤害保留"],
  explosionTargets: ["explosionTargets", "爆炸额外目标"],
  explosionDamageMultiplier: ["explosionDamageMultiplier", "爆炸伤害倍率"],
  critChance: ["critChance", "武器暴击率", "暴击率"],
  critMultiplier: ["critMultiplier", "暴击倍率"],
};

const scalingAliases = {
  meleeDamage: ["meleeDamage", "近战缩放", "近战伤害"],
  rangedDamage: ["rangedDamage", "远程缩放", "远程伤害"],
  elementalDamage: ["elementalDamage", "元素缩放", "元素伤害"],
  engineering: ["engineering", "工程缩放", "工程学"],
};

function valueByAliases(source, aliases) {
  if (!source || typeof source !== "object") return undefined;
  if (Array.isArray(source)) {
    const row = source.find((item) => {
      const label = item?.name ?? item?.label ?? item?.key ?? item?.stat ?? item?.["名称"];
      const normalizedLabel = String(label).toLowerCase().trim();
      return label && aliases.some((alias) => normalizedLabel === String(alias).toLowerCase());
    });
    return row?.value ?? row?.["值"] ?? row?.amount;
  }

  for (const alias of aliases) {
    if (source[alias] !== undefined) return source[alias];
  }
  return undefined;
}

function objectByAliases(source, aliases) {
  for (const alias of aliases) {
    const value = source?.[alias];
    if (value && typeof value === "object") return value;
  }
  return null;
}

function normalizeParsedSimulatorData(parsed) {
  if (!parsed || typeof parsed !== "object") return null;

  const statsSource =
    objectByAliases(parsed, [
      "statsOcr",
      "ocrStats",
      "rows",
      "stats",
      "属性",
      "主要属性",
      "attributes",
      "mainStats",
    ]) ?? parsed;
  const weaponSource = objectByAliases(parsed, ["weapon", "武器", "当前武器"]);
  const scalingSource =
    objectByAliases(weaponSource, ["scaling", "缩放", "属性缩放"]) ??
    objectByAliases(parsed, ["scaling", "缩放"]);

  const normalized = {
    ...parsed,
    stats: {},
  };

  Object.entries(statAliases).forEach(([key, aliases]) => {
    const value = valueByAliases(statsSource, aliases);
    if (value !== undefined) normalized.stats[key] = value;
  });

  if (weaponSource) {
    normalized.weapon = {
      scaling: {},
    };

    Object.entries(weaponAliases).forEach(([key, aliases]) => {
      const value = valueByAliases(weaponSource, aliases);
      if (value !== undefined) normalized.weapon[key] = value;
    });
  }

  if (scalingSource) {
    normalized.weapon ??= { scaling: {} };
    normalized.weapon.scaling ??= {};
    Object.entries(scalingAliases).forEach(([key, aliases]) => {
      const value = valueByAliases(scalingSource, aliases);
      if (value !== undefined) normalized.weapon.scaling[key] = value;
    });
  }

  normalized.characterName =
    parsed.characterName ?? parsed.character ?? parsed["角色"] ?? parsed["人物"] ?? null;
  normalized.characterId = parsed.characterId ?? parsed["角色ID"] ?? null;
  normalized.wave = parsed.wave ?? parsed["波次"] ?? parsed["当前波次"] ?? null;

  return normalized;
}

function findCharacterIdByName(name) {
  if (!name) return null;
  const query = String(name).toLowerCase();
  return (
    getAvailableCharacters().find((character) => {
      const text = `${character.id} ${character.name} ${character.cnHint}`.toLowerCase();
      return text.includes(query) || query.includes(character.name.toLowerCase());
    })?.id ?? null
  );
}

function applyParsedSimulatorData(parsed) {
  parsed = normalizeParsedSimulatorData(parsed);
  if (!parsed || typeof parsed !== "object") return false;
  let changed = false;

  const matchedCharacterId =
    getAvailableCharacters().some((character) => character.id === parsed.characterId)
      ? parsed.characterId
      : findCharacterIdByName(parsed.characterName);
  if (matchedCharacterId && matchedCharacterId !== state.simulatorCharacter) {
    state.simulatorCharacter = matchedCharacterId;
    const characterSelect = $("#simulator-character");
    if (characterSelect) characterSelect.value = matchedCharacterId;
    changed = true;
  }

  if (parsed.stats && typeof parsed.stats === "object") {
    Object.keys(statLabels).forEach((key) => {
      if (parsed.stats[key] !== undefined) {
        state.stats[key] = numberOrExisting(parsed.stats[key], state.stats[key]);
        changed = true;
      }
    });
  }

  if (parsed.weapon && typeof parsed.weapon === "object") {
    Object.keys(weaponLabels).forEach((key) => {
      if (key === "name" && parsed.weapon.name) {
        state.weapon.name = String(parsed.weapon.name);
        changed = true;
      } else if (parsed.weapon[key] !== undefined) {
        state.weapon[key] = numberOrExisting(parsed.weapon[key], state.weapon[key]);
        changed = true;
      }
    });

    if (parsed.weapon.scaling && typeof parsed.weapon.scaling === "object") {
      DAMAGE_TYPES.forEach((key) => {
        if (parsed.weapon.scaling[key] !== undefined) {
          state.weapon.scaling[key] = numberOrExisting(
            parsed.weapon.scaling[key],
            state.weapon.scaling[key],
          );
          changed = true;
        }
      });
    }
  }

  if (parsed.itemDelta && typeof parsed.itemDelta === "object") {
    Object.keys(statLabels).forEach((key) => {
      if (parsed.itemDelta[key] !== undefined) {
        state.itemDelta[key] = numberOrExisting(parsed.itemDelta[key], state.itemDelta[key]);
        changed = true;
      }
    });
  }

  if (parsed.combatContext && typeof parsed.combatContext === "object") {
    Object.keys(combatContextLabels).forEach((key) => {
      if (parsed.combatContext[key] !== undefined) {
        state.combatContext[key] = numberOrExisting(
          parsed.combatContext[key],
          state.combatContext[key],
        );
        changed = true;
      }
    });
  }

  if (parsed.scenarioId && getAvailableScenarios().some((scenario) => scenario.id === parsed.scenarioId)) {
    state.scenarioId = parsed.scenarioId;
    changed = true;
  }

  if (
    parsed.itemEffectId &&
    getAvailableItemEffects().some((itemEffect) => itemEffect.id === parsed.itemEffectId)
  ) {
    state.itemEffectId = parsed.itemEffectId;
    changed = true;
  }

  if (parsed.roundingMode && ["none", "floor", "round", "ceil"].includes(parsed.roundingMode)) {
    state.roundingMode = parsed.roundingMode;
    const roundingSelect = $("#rounding-mode");
    if (roundingSelect) roundingSelect.value = state.roundingMode;
    changed = true;
  }

  return changed;
}

async function parseScreenshotUpload() {
  const input = $("#screenshot-file");
  const file = input?.files?.[0];
  if (!file) {
    state.screenshotParse = {
      status: "error",
      message: "请先选择一张截图或照片。",
      rawText: "",
      parsed: null,
    };
    renderScreenshotParseOutput();
    return;
  }

  state.screenshotParse = {
    status: "loading",
    message: "正在发送到本地解析服务。",
    rawText: "",
    parsed: null,
  };
  renderScreenshotParseOutput();

  try {
    const imageDataUrl = await fileToDataUrl(file);
    const selectedCharacter = getAvailableCharacters().find(
      (character) => character.id === state.simulatorCharacter,
    );
    const response = await fetch("/api/parse-screenshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageDataUrl,
        selectedCharacter: selectedCharacter
          ? {
              id: selectedCharacter.id,
              name: selectedCharacter.name,
              cnHint: selectedCharacter.cnHint,
            }
          : null,
      }),
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const detailMessage =
        payload.detail?.error?.message ?? payload.detail?.message ?? payload.error;
      throw new Error(detailMessage || `HTTP ${response.status}`);
    }

    const parsed =
      payload.parsed ?? parseJsonFromText(payload.text) ?? parseOcrStatsFromText(payload.text);
    const applied = applyParsedSimulatorData(parsed);
    state.screenshotParse = {
      status: "success",
      message: applied
        ? "已解析并将可识别字段填入模拟器。请核对数值，截图识别仍可能有误。"
        : "已解析，但没有找到可直接填入模拟器的字段。",
      rawText: payload.text ?? "",
      parsed,
    };

    if (applied) {
      renderStatFields();
      renderWeaponFields();
      renderScenarioFields();
      renderItemFields();
      renderResults();
    }
  } catch (error) {
    state.screenshotParse = {
      status: "error",
      message: `解析失败：${error.message}。请确认使用 npm run start 启动，并且 env.local 指向可用的 LM Studio 服务。`,
      rawText: "",
      parsed: null,
    };
  }

  renderScreenshotParseOutput();
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

  $("#simulator-character").addEventListener("change", (event) => {
    state.simulatorCharacter = event.target.value;
  });

  $(".compendium-panel").addEventListener("click", (event) => {
    if (event.target.closest("#compendium-search-button")) {
      applyCompendiumSearch();
      return;
    }

    if (event.target.closest("#compendium-clear-search")) {
      clearCompendiumSearchState();
      renderCompendium();
    }
  });

  $("#compendium-search").addEventListener("input", (event) => {
    state.compendiumSearchDraft = event.target.value;
  });

  $("#compendium-search").addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      applyCompendiumSearch();
    }
  });

  window.addEventListener("hashchange", syncAppRoute);

  $("#rounding-mode").addEventListener("change", (event) => {
    state.roundingMode = event.target.value;
    renderResults();
  });

  $("#reset-item").addEventListener("click", () => {
    state.itemDelta = { ...DEFAULT_ITEM_DELTA };
    renderItemFields();
    renderResults();
  });

  $("#parse-screenshot").addEventListener("click", () => {
    parseScreenshotUpload();
  });

  $("#clear-screenshot-parse").addEventListener("click", () => {
    state.screenshotParse = {
      status: "idle",
      message: "",
      rawText: "",
      parsed: null,
    };
    const input = $("#screenshot-file");
    if (input) input.value = "";
    renderScreenshotParseOutput();
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
    state.simulatorCharacter = "lucky";
    window.location.hash = "#simulator";
    render();
  });
}

function render() {
  renderPageShell();
  renderStrategyControls();
  renderSimulatorCharacterControl();
  renderStrategyGuide();
  renderCompendium();
  renderStatFields();
  renderWeaponFields();
  renderScenarioFields();
  renderItemFields();
  renderScreenshotParseOutput();
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
  renderCompendium();
}

async function loadOfficialLocalization() {
  try {
    const response = await fetch("./data/official-localization.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    state.officialLocalization = await response.json();
    state.localizationLoadState = "loaded";
  } catch (error) {
    console.warn("Failed to load official localization", error);
    state.officialLocalization = null;
    state.localizationLoadState = "error";
  }

  renderStrategyGuide();
  renderCompendium();
}

bindControls();
syncAppRoute();
render();
loadOfficialCatalog();
loadOfficialLocalization();
