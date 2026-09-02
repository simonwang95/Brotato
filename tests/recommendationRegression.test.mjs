import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  generateStrategyGuide,
  getAvailableCharacters,
  itemMatchesGroup,
  reportWeightChange,
} from "../src/strategyGenerator.js";

const officialCatalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));

const TOP_N_BASELINES = {
  "lucky:normal20": {
    weapons: ["slingshot", "rock", "lute", "pruner", "WEAPON_FLUTE"],
    items: [
      "cyberball",
      "sifdsRelic",
      "babyGecko",
      "babyElephant",
      "luckyCharm",
      "babyWithABeard",
      "ITEM_PEARL",
      "ITEM_JERKY",
    ],
  },
  "lucky:endless": {
    weapons: ["lute", "slingshot", "pruner", "WEAPON_FLUTE", "WEAPON_POTATO_THROWER"],
    items: [
      "sifdsRelic",
      "babyGecko",
      "cyberball",
      "babyElephant",
      "babyWithABeard",
      "luckyCharm",
      "ITEM_PEARL",
      "ITEM_PIGGY_BANK",
    ],
  },
  "knight:normal20": {
    weapons: ["sword", "spikyShield", "spear", "WEAPON_TRIDENT", "WEAPON_CHOPPER"],
    items: [
      "whetstone",
      "wings",
      "coffee",
      "ITEM_MEDAL",
      "ITEM_RIPOSTE",
      "ITEM_VIGILANTE_RING",
      "ITEM_DYNAMITE",
      "ITEM_GRINDS_MAGICAL_LEAF",
    ],
  },
  "knight:endless": {
    weapons: ["sword", "spikyShield", "spear", "WEAPON_ROCK", "WEAPON_TRIDENT"],
    items: [
      "whetstone",
      "wings",
      "coffee",
      "ITEM_PIGGY_BANK",
      "ITEM_LUCKY_COIN",
      "ITEM_BABY_GECKO",
      "ITEM_EXPLOSIVE_SHELLS",
      "ITEM_POTATO",
    ],
  },
  "ghost:normal20": {
    weapons: ["ghostAxe", "ghostFlint", "ghostScepter", "WEAPON_SCYTHE"],
    items: [
      "wings",
      "coffee",
      "whetstone",
      "ITEM_ADRENALINE",
      "ITEM_LUCKY_COIN",
      "ITEM_MEDAL",
      "ITEM_RIPOSTE",
      "ITEM_VIGILANTE_RING",
    ],
  },
  "ghost:endless": {
    weapons: ["ghostAxe", "ghostFlint", "ghostScepter", "WEAPON_SCYTHE"],
    items: [
      "wings",
      "coffee",
      "whetstone",
      "ITEM_LUCKY_COIN",
      "ITEM_PIGGY_BANK",
      "ITEM_BABY_GECKO",
      "ITEM_EXPLOSIVE_SHELLS",
      "ITEM_POTATO",
    ],
  },
  "engineer:normal20": {
    weapons: ["wrench", "screwdriver", "WEAPON_CHAINSAW", "WEAPON_CHAIN_GUN", "WEAPON_DRILL"],
    items: [
      "turret",
      "robotArm",
      "coupon",
      "ITEM_JERKY",
      "ITEM_PIGGY_BANK",
      "ITEM_BUILDER_TURRET",
      "ITEM_METAL_DETECTOR",
      "ITEM_LURE",
    ],
  },
  "engineer:endless": {
    weapons: ["wrench", "screwdriver", "WEAPON_CHAINSAW", "WEAPON_CHAIN_GUN", "WEAPON_DRILL"],
    items: [
      "robotArm",
      "turret",
      "coupon",
      "ITEM_PIGGY_BANK",
      "ITEM_CROWN",
      "ITEM_GRINDS_MAGICAL_LEAF",
      "ITEM_METAL_DETECTOR",
      "ITEM_SPYGLASS",
    ],
  },
  "beastMaster:normal20": {
    weapons: [],
    items: [
      "catlingGun",
      "bonkDog",
      "botOMine",
      "blazemander",
      "wings",
      "lootworm",
      "ITEM_PEARL",
      "ITEM_JERKY",
    ],
  },
  "beastMaster:endless": {
    weapons: [],
    items: [
      "botOMine",
      "catlingGun",
      "bonkDog",
      "wings",
      "blazemander",
      "lootworm",
      "ITEM_PEARL",
      "ITEM_BABY_GECKO",
    ],
  },
  // Druid 禁用 lifesteal / lifesteal_and_hp_regeneration / hp_regeneration 组。
  // Penguin 标签集合恰为 ["stat_hp_regeneration"]，属 hp_regeneration 组，
  // 游戏商店不会向 Druid 出售（标签集合精确相等规则，第三轮 P1-B 修正）。
  "druid:normal20": {
    weapons: ["sickle", "pruner", "wand", "WEAPON_LUTE", "WEAPON_TORCH"],
    items: [
      "crystal",
      "cauldron",
      "ITEM_PEARL",
      "ITEM_PIGGY_BANK",
      "ITEM_SNAKE",
      "ITEM_CROWN",
      "ITEM_EYES_SURGERY",
      "ITEM_MEDAL",
    ],
  },
  "druid:endless": {
    weapons: ["sickle", "pruner", "wand", "WEAPON_LUTE", "WEAPON_TORCH"],
    items: [
      "crystal",
      "cauldron",
      "ITEM_PEARL",
      "ITEM_EYES_SURGERY",
      "ITEM_PIGGY_BANK",
      "ITEM_SNAKE",
      "ITEM_CROWN",
      "ITEM_EXPLOSIVE_SHELLS",
    ],
  },
  "wounded:normal20": {
    weapons: ["smg", "slingshot", "taser", "WEAPON_TORCH", "WEAPON_DOUBLE_BARREL_SHOTGUN"],
    items: [
      "tardigrade",
      "coupon",
      "wings",
      "scope",
      "coffee",
      "ITEM_PIGGY_BANK",
      "ITEM_METAL_DETECTOR",
      "ITEM_POWER_GENERATOR",
    ],
  },
  "wounded:endless": {
    weapons: ["smg", "taser", "slingshot", "WEAPON_TORCH", "WEAPON_LUTE"],
    items: [
      "babyGecko",
      "coupon",
      "tardigrade",
      "wings",
      "scope",
      "ITEM_PEARL",
      "ITEM_PIGGY_BANK",
      "ITEM_CROWN",
    ],
  },
};

const OPTION_BASELINES = [
  {
    name: "Lucky endless damage",
    characterId: "lucky",
    modeId: "endless",
    options: { preferenceId: "damage" },
    weapons: ["lute", "slingshot", "pruner", "WEAPON_FLUTE", "WEAPON_POTATO_THROWER"],
    items: [
      "sifdsRelic",
      "babyGecko",
      "cyberball",
      "babyElephant",
      "babyWithABeard",
      "luckyCharm",
      "ITEM_PEARL",
      "ITEM_HEAVY_BULLETS",
    ],
  },
  {
    name: "Knight base melee",
    characterId: "knight",
    modeId: "normal20",
    options: { dlcOptionId: "baseOnly", preferenceId: "melee" },
    weapons: ["sword", "spikyShield", "spear", "WEAPON_CHOPPER", "WEAPON_VORPAL_SWORD"],
    items: [
      "whetstone",
      "wings",
      "coffee",
      "ITEM_RIPOSTE",
      "ITEM_CLAW_TREE",
      "ITEM_DEFECTIVE_STEROIDS",
      "ITEM_LITTLE_MUSCLEY_DUDE",
      "ITEM_ROBOT_ARM",
    ],
  },
  {
    name: "Ghost default pool",
    characterId: "ghost",
    modeId: "normal20",
    options: { unlockOptionId: "defaultOnly" },
    weapons: ["ghostAxe", "ghostFlint", "ghostScepter", "WEAPON_SCYTHE"],
    items: [
      "wings",
      "coffee",
      "ITEM_ADRENALINE",
      "ITEM_LUCKY_COIN",
      "ITEM_MEDAL",
      "ITEM_RIPOSTE",
      "ITEM_VIGILANTE_RING",
      "ITEM_DYNAMITE",
    ],
  },
  {
    name: "Engineer engineering",
    characterId: "engineer",
    modeId: "normal20",
    options: { preferenceId: "engineering" },
    weapons: ["wrench", "screwdriver", "WEAPON_CHAINSAW", "WEAPON_CHAIN_GUN", "WEAPON_DRILL"],
    items: [
      "turret",
      "robotArm",
      "coupon",
      "ITEM_BUILDER_TURRET",
      "ITEM_METAL_DETECTOR",
      "ITEM_CLOCKWORK_WASP",
      "ITEM_IMPROVED_TOOLS",
      "ITEM_LIGHTHOUSE",
    ],
  },
  {
    name: "Druid elemental",
    characterId: "druid",
    modeId: "normal20",
    options: { preferenceId: "elemental" },
    weapons: ["sickle", "pruner", "wand", "WEAPON_TORCH", "WEAPON_LUTE"],
    // Penguin 属 Druid 禁用的 hp_regeneration 组（标签精确相等），不再出现。
    items: [
      "crystal",
      "cauldron",
      "ITEM_SNAKE",
      "ITEM_EYES_SURGERY",
      "ITEM_CHARCOAL",
      "ITEM_ICE_CUBE",
      "ITEM_PEARL",
      "ITEM_ALLOY",
    ],
  },
  {
    name: "Wounded ranged default pool",
    characterId: "wounded",
    modeId: "endless",
    options: { preferenceId: "ranged", unlockOptionId: "defaultOnly" },
    weapons: ["smg", "slingshot", "taser", "WEAPON_CHAIN_GUN", "WEAPON_DOUBLE_BARREL_SHOTGUN"],
    items: [
      "babyGecko",
      "coupon",
      "tardigrade",
      "wings",
      "scope",
      "ITEM_HEAVY_BULLETS",
      "ITEM_HONEY",
      "ITEM_ALLOY",
    ],
  },
];

function candidateKey(candidate) {
  return candidate.weaponId ?? candidate.itemId ?? candidate.official?.nameKey;
}

for (const [scenario, expected] of Object.entries(TOP_N_BASELINES)) {
  const [characterId, modeId] = scenario.split(":");
  const guide = generateStrategyGuide(characterId, modeId, { officialCatalog });
  assert.deepEqual(
    guide.recommendedWeapons.slice(0, 5).map(candidateKey),
    expected.weapons,
    `${scenario} weapon Top-N changed; review the scoring reasons before updating the baseline`,
  );
  assert.deepEqual(
    guide.keyItems.slice(0, 8).map(candidateKey),
    expected.items,
    `${scenario} item Top-N changed; review the scoring reasons before updating the baseline`,
  );
}

for (const scenario of OPTION_BASELINES) {
  const guide = generateStrategyGuide(scenario.characterId, scenario.modeId, {
    officialCatalog,
    ...scenario.options,
  });
  const recommendations = [...guide.recommendedWeapons, ...guide.keyItems];
  assert.deepEqual(
    guide.recommendedWeapons.slice(0, 5).map(candidateKey),
    scenario.weapons,
    `${scenario.name} weapon Top-N changed; review option scoring before updating the baseline`,
  );
  assert.deepEqual(
    guide.keyItems.slice(0, 8).map(candidateKey),
    scenario.items,
    `${scenario.name} item Top-N changed; review option scoring before updating the baseline`,
  );

  if (scenario.options.dlcOptionId === "baseOnly") {
    assert.ok(
      recommendations.every((candidate) => candidate.official.sources.every((source) => source === "base")),
      `${scenario.name} must not include DLC recommendations`,
    );
  }
  if (scenario.options.unlockOptionId === "defaultOnly") {
    assert.ok(
      recommendations.every((candidate) =>
        candidate.official.records.every((record) => record.unlockedByDefault !== false),
      ),
      `${scenario.name} must not include locked recommendations`,
    );
  }
}

{
  const knight = generateStrategyGuide("knight", "normal20", {
    officialCatalog,
    dlcOptionId: "baseOnly",
    preferenceId: "melee",
  });
  assert.ok(
    knight.recommendedWeapons.every(({ weapon }) => weapon.tags.includes("Melee")),
    "Knight melee preference must not admit a ranged-only weapon",
  );

  const engineer = generateStrategyGuide("engineer", "normal20", {
    officialCatalog,
    preferenceId: "engineering",
  });
  assert.deepEqual(
    engineer.recommendedWeapons.slice(0, 2).map(candidateKey),
    ["wrench", "screwdriver"],
    "Engineer engineering preference should retain both core tools",
  );
  assert.ok(
    engineer.keyItems.slice(0, 8).some((candidate) => candidateKey(candidate) === "ITEM_BUILDER_TURRET"),
    "Engineer engineering preference should surface an official structure item",
  );

  const druid = generateStrategyGuide("druid", "normal20", {
    officialCatalog,
    preferenceId: "elemental",
  });
  assert.ok(
    ["ITEM_SNAKE", "ITEM_EYES_SURGERY"].every((key) =>
      druid.keyItems.slice(0, 8).some((candidate) => candidateKey(candidate) === key),
    ),
    "Druid elemental preference should surface verified burning support",
  );

  const wounded = generateStrategyGuide("wounded", "endless", {
    officialCatalog,
    preferenceId: "ranged",
    unlockOptionId: "defaultOnly",
  });
  assert.ok(
    wounded.keyItems.some((candidate) => candidateKey(candidate) === "tardigrade"),
    "Wounded should retain the official one-hit protection item under filtering",
  );
  assert.ok(
    wounded.keyItems.every(({ official }) =>
      official.records.every(
        ({ id }) => !["item_armor", "item_max_hp", "item_hp_regeneration", "item_lifesteal"].includes(id),
      ),
    ),
    "Wounded must not recommend officially banned sustain or armor items",
  );
}

for (const character of getAvailableCharacters()) {
  for (const modeId of ["normal20", "endless"]) {
    const guide = generateStrategyGuide(character.id, modeId, { officialCatalog });
    const candidates = [...guide.recommendedWeapons, ...guide.keyItems];
    for (const candidate of candidates) {
      assert.ok(candidate.recommendationReasons?.length, `${character.id}:${modeId} needs reasons`);
      assert.ok(
        candidate.recommendationReasons.every((reason) => !/触发伤害 0(?:\.0+)? DPS/.test(reason)),
        `${character.id}:${modeId}:${candidateKey(candidate)} must not show a misleading 0 DPS reason`,
      );
    }
  }
}

// P1-9 / R4 / F3：全部 64 个官方角色的独立专家基准（fixture 与输出解耦，非循环论证）。
// 正向（mustInclude）：fixture 中记录的核心候选（含排名）必须出现在输出中，且排名不越界；
// 负向（mustExclude）：官方目录中该角色的禁用项不得出现。
// fixture 存于 tests/fixtures/recommendationBaseline.json（独立于运行时输出，
// 由 scripts/generate-recommendation-baseline.mjs 生成）。
//
// F3：候选比较统一使用官方 nameKey 命名空间（candidate.official.nameKey）。
// 手写候选（coffee）与官方候选（ITEM_COFFEE）归一到同一 id，禁用检查对两者同等生效；
// 无法映射到官方 nameKey 的候选必须显式报错，绝不回退另一套 id 后继续断言。
const norm = (id) => String(id).toUpperCase();
function officialId(candidate) {
  const nameKey = candidate.official?.nameKey;
  return nameKey ? String(nameKey).toUpperCase() : null;
}

// F3 / 第三轮 P1-B：禁用检查（纯函数，可独立做突变验证）。
// 返回违规列表；无法映射的候选（official.nameKey 缺失）单独以 reason="unmapped" 报告。
//
// mustExclude 条目分两类，都必须真实可命中：
// - ITEM_*/WEAPON_* 官方 nameKey：与候选 nameKey 相等即违规（reason="banned"）；
// - 禁用组标记（LIFESTEAL 等，来自角色 bannedItemGroups）：候选的官方记录
//   标签集合与该组标签集合精确相等（groupTagSet / itemMatchesGroup，与生成器
//   同源，复刻游戏商店过滤规则）即违规（reason="banned-group"）。
//   组标记不再做无意义的 nameKey 相等比较。
// 角色 bannedUpgrades（升级商店禁用）不在此列：升级道具不在候选空间内
// （目录与攻略输出均不含升级记录），单独存于 fixture 的 bannedUpgrades 字段
// 做存在性校验，不计入候选级负向断言。
function findBannedViolations(characterId, modeId, candidates, bannedIds) {
  const violations = [];
  const bannedNameKeys = new Set();
  const bannedGroupMarkers = new Set();
  for (const id of bannedIds) {
    const n = norm(id);
    if (n.startsWith("ITEM_") || n.startsWith("WEAPON_")) {
      bannedNameKeys.add(n);
    } else {
      bannedGroupMarkers.add(n);
    }
  }
  const seen = new Set();
  for (const candidate of candidates) {
    const id = officialId(candidate);
    if (!id) {
      violations.push({
        characterId,
        modeId,
        candidate: candidate.weaponId ?? candidate.itemId ?? "(unknown)",
        bannedId: null,
        reason: "unmapped",
      });
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    if (bannedNameKeys.has(id)) {
      violations.push({ characterId, modeId, candidate: id, bannedId: id, reason: "banned" });
    }
    const records = candidate.official?.records ?? [];
    for (const marker of bannedGroupMarkers) {
      const inBannedGroup = records.some((record) => itemMatchesGroup(record, marker));
      if (inBannedGroup) {
        violations.push({ characterId, modeId, candidate: id, bannedId: marker, reason: "banned-group" });
      }
    }
  }
  return violations;
}
{
  const fixture = JSON.parse(readFileSync("tests/fixtures/recommendationBaseline.json", "utf8"));
  let positiveChecked = 0;
  let negativeChecked = 0;
  let rankChecked = 0;
  let upgradeChecked = 0;
  for (const character of getAvailableCharacters()) {
    for (const modeId of ["normal20", "endless"]) {
      const guide = generateStrategyGuide(character.id, modeId, { officialCatalog });
      // F3：每个输出候选都必须能映射到官方 nameKey（显式报错，不静默回退）。
      for (const candidate of [...guide.recommendedWeapons, ...guide.keyItems]) {
        assert.ok(
          officialId(candidate) !== null,
          `${character.id}:${modeId} 候选 ${candidate.weaponId ?? candidate.itemId} 无法映射到官方 nameKey，禁用检查无法进行`,
        );
      }
      // 输出候选：武器 + 道具，按出现顺序记录排名（1-based），统一官方 nameKey 命名空间。
      const outputWeapons = guide.recommendedWeapons.map((c) => officialId(c));
      const outputItems = guide.keyItems.map((c) => officialId(c));
      const outputAll = new Set([...outputWeapons, ...outputItems]);
      const entry = fixture[`${character.id}:${modeId}`];
      if (!entry) {
        assert.fail(`${character.id}:${modeId} 缺少 fixture 条目（应覆盖全部角色/模式）`);
      }
      // 正向：核心候选必须出现，且排名不越界（fixture id 为官方 nameKey）。
      for (const { id, rank } of entry.mustInclude.weapons ?? []) {
        const idx = outputWeapons.indexOf(norm(id));
        assert.ok(idx >= 0, `${character.id}:${modeId} 核心武器 ${id} 应出现在输出中（fixture 记录但输出缺失）`);
        assert.ok(idx + 1 <= rank + 2, `${character.id}:${modeId} 核心武器 ${id} 排名越界（fixture 排名 ${rank}，实际 ${idx + 1}）`);
        positiveChecked += 1;
        rankChecked += 1;
      }
      for (const { id, rank } of entry.mustInclude.items ?? []) {
        const idx = outputItems.indexOf(norm(id));
        assert.ok(idx >= 0, `${character.id}:${modeId} 核心道具 ${id} 应出现在输出中（fixture 记录但输出缺失）`);
        assert.ok(idx + 1 <= rank + 2, `${character.id}:${modeId} 核心道具 ${id} 排名越界（fixture 排名 ${rank}，实际 ${idx + 1}）`);
        positiveChecked += 1;
        rankChecked += 1;
      }
      // 负向：官方禁用项不得出现（F3：与候选同一官方 nameKey 命名空间；
      // P1-B：组标记走标签集合精确匹配，每条断言都真实可命中）。
      const violations = findBannedViolations(character.id, modeId, [...guide.recommendedWeapons, ...guide.keyItems], entry.mustExclude ?? []);
      assert.ok(
        violations.length === 0,
        `${character.id}:${modeId} 不应推荐官方禁用项：${violations.map((v) => `${v.candidate}（${v.reason}：${v.bannedId ?? "-"}）`).join(", ")}`,
      );
      negativeChecked += (entry.mustExclude ?? []).length;
      // 升级商店禁用（bannedUpgrades）：升级道具不在候选空间内，不做候选级断言，
      // 但每条标记必须格式合法且其属性部分在目录效果键词汇中存在（防脏数据）。
      for (const marker of entry.bannedUpgrades ?? []) {
        assert.ok(
          /^UPGRADE_[A-Z0-9_]+$/.test(marker),
          `${character.id}:${modeId} bannedUpgrades 标记格式非法：${marker}`,
        );
        const statPart = marker.slice("UPGRADE_".length).toLowerCase();
        const statExists = officialCatalog.records.some((record) =>
          (record.effects ?? []).some((effect) => effect.key === `stat_${statPart}` || effect.key === statPart),
        );
        assert.ok(statExists, `${character.id}:${modeId} bannedUpgrades 标记 ${marker} 的属性部分在目录中不存在`);
        upgradeChecked += 1;
      }
    }
  }
  assert.ok(positiveChecked > 0, "应检查到正向基准");
  console.log(
    `[P1-9] 64 角色独立基准：正向 ${positiveChecked} 项（含排名 ${rankChecked}）、` +
      `负向 ${negativeChecked} 项（nameKey + 禁用组标记，全部真实可命中）、` +
      `升级商店禁用 ${upgradeChecked} 项（存在性校验，不计入候选级断言），全部通过`,
  );

  // F3 突变验证：向 Bull 加入同一禁用项（ITEM_COFFEE）的手写候选与官方补充候选，
  // 禁用检查都必须触发明确的角色、模式和候选错误（两套 id 命名空间同等生效）。
  const bull = getAvailableCharacters().find((c) => c.id === "bull");
  assert.ok(bull, "应存在 Bull 角色");
  for (const modeId of ["normal20", "endless"]) {
    const guide = generateStrategyGuide("bull", modeId, { officialCatalog });
    const entry = fixture[`bull:${modeId}`];
    assert.ok((entry.mustExclude ?? []).includes("ITEM_COFFEE"), `bull:${modeId} fixture 应把 ITEM_COFFEE 列入禁用`);
    const baseCandidates = [...guide.recommendedWeapons, ...guide.keyItems];

    // 突变 1：手写候选 coffee（official 映射到 ITEM_COFFEE）被错误加入输出。
    const handWrittenCoffee = {
      itemId: "coffee",
      official: { nameKey: "ITEM_COFFEE", found: true, records: [] },
    };
    const v1 = findBannedViolations("bull", modeId, [...baseCandidates, handWrittenCoffee], entry.mustExclude);
    assert.ok(
      v1.some((v) => v.reason === "banned" && v.candidate === "ITEM_COFFEE" && v.characterId === "bull" && v.modeId === modeId),
      `F3 突变：手写 coffee 加入 bull:${modeId} 应触发明确禁用错误（实际 ${JSON.stringify(v1)}）`,
    );

    // 突变 2：官方补充候选 ITEM_COFFEE 被错误加入输出。
    const officialCoffee = {
      itemId: "official:ITEM_COFFEE",
      officialCandidate: true,
      official: { nameKey: "ITEM_COFFEE", found: true, records: [] },
    };
    const v2 = findBannedViolations("bull", modeId, [...baseCandidates, officialCoffee], entry.mustExclude);
    assert.ok(
      v2.some((v) => v.reason === "banned" && v.candidate === "ITEM_COFFEE" && v.characterId === "bull" && v.modeId === modeId),
      `F3 突变：官方 ITEM_COFFEE 加入 bull:${modeId} 应触发明确禁用错误（实际 ${JSON.stringify(v2)}）`,
    );

    // 突变 3：无法映射到官方 nameKey 的候选必须显式报告（不静默跳过）。
    const unmapped = { itemId: "mystery", official: { found: false, records: [] } };
    const v3 = findBannedViolations("bull", modeId, [...baseCandidates, unmapped], entry.mustExclude);
    assert.ok(
      v3.some((v) => v.reason === "unmapped" && v.candidate === "mystery"),
      `F3 突变：无法映射候选加入 bull:${modeId} 应显式报告（实际 ${JSON.stringify(v3)}）`,
    );

    // 突变 4（第三轮 P1-B）：禁用组标记必须真实可命中。
    // Whetstone 不在 Bull 的 bannedItems 中，但其标签集合恰为 ["stat_lifesteal"]，
    // 属于 Bull 禁用的 lifesteal 组（游戏商店按标签集合精确相等过滤）——
    // 加入输出应触发 banned-group 违规（旧实现只做 nameKey 相等比较，此类违规永远无法命中）。
    assert.ok(
      (entry.mustExclude ?? []).includes("LIFESTEAL"),
      `bull:${modeId} fixture 应把禁用组标记 LIFESTEAL 列入 mustExclude`,
    );
    const whetstoneRecord = officialCatalog.records.find((r) => r.nameKey === "ITEM_WHETSTONE");
    assert.ok(whetstoneRecord, "目录应包含 ITEM_WHETSTONE 记录");
    assert.deepEqual(whetstoneRecord.tags, ["stat_lifesteal"], "Whetstone 标签集合应恰为 [stat_lifesteal]");
    const syntheticWhetstone = {
      itemId: "official:ITEM_WHETSTONE",
      officialCandidate: true,
      official: { nameKey: "ITEM_WHETSTONE", found: true, records: [whetstoneRecord] },
    };
    const v4 = findBannedViolations("bull", modeId, [...baseCandidates, syntheticWhetstone], entry.mustExclude);
    assert.ok(
      v4.some((v) => v.reason === "banned-group" && v.candidate === "ITEM_WHETSTONE" && v.bannedId === "LIFESTEAL"),
      `P1-B 突变：禁用组成员 ITEM_WHETSTONE 加入 bull:${modeId} 应触发 banned-group 错误（实际 ${JSON.stringify(v4)}）`,
    );
  }
  console.log("[F3/P1-B] 突变验证：手写候选 / 官方候选 / 未映射候选 / 禁用组成员候选均触发明确错误");
}

// P1-9：评分分解与权重变化影响报告。
// (1) 每个候选都应携带结构化 scoreBreakdown，且各分量之和等于总分；
// (2) reportWeightChange 应能列出受影响角色与排序原因（关键评分分量）。
{
  let breakdownChecked = 0;
  for (const character of getAvailableCharacters().slice(0, 8)) {
    for (const modeId of ["normal20", "endless"]) {
      const guide = generateStrategyGuide(character.id, modeId, { officialCatalog });
      for (const candidate of [...guide.recommendedWeapons, ...guide.keyItems]) {
        const breakdown = candidate.scoreBreakdown;
        assert.ok(breakdown && typeof breakdown === "object", `${character.id}:${modeId} 候选应携带 scoreBreakdown`);
        const sum = Object.values(breakdown).reduce((acc, value) => acc + value, 0);
        assert.ok(
          Math.abs(sum - candidate.recommendationScore) < 1e-6,
          `${character.id}:${modeId}:${candidateKey(candidate)} 分解之和应等于总分`,
        );
        breakdownChecked += 1;
      }
    }
  }
  assert.ok(breakdownChecked > 0, "应检查到评分分解");

  // 权重变化影响报告（R4）：属性协同权重翻倍应影响部分角色的排序；
  // 报告须覆盖武器 + 道具（before/after/reasons 均含 weapon 与 item 两类）。
  const affected = reportWeightChange({ statSynergy: 2 }, { officialCatalog });
  assert.ok(Array.isArray(affected), "reportWeightChange 应返回受影响列表");
  assert.ok(affected.length > 0, "属性协同权重翻倍应影响部分角色排序");
  let weaponAffected = 0;
  let itemAffected = 0;
  for (const entry of affected) {
    assert.ok(entry.character && entry.mode, "受影响条目应包含角色与模式");
    assert.ok(entry.before && entry.after && entry.reasons, "应包含排序前后对比与原因");
    // R4：报告须覆盖武器与道具两类。
    for (const kind of ["weapon", "item"]) {
      assert.ok(Array.isArray(entry.before[kind]) && Array.isArray(entry.after[kind]), `受影响条目应包含 ${kind} 排序前后对比`);
      assert.ok(Array.isArray(entry.reasons[kind]), `受影响条目应包含 ${kind} 排序原因`);
      for (const reason of entry.reasons[kind]) {
        assert.ok(reason.key && Array.isArray(reason.topComponents), `${kind} 排序原因应包含关键评分分量`);
      }
      if (JSON.stringify(entry.before[kind]) !== JSON.stringify(entry.after[kind])) {
        if (kind === "weapon") weaponAffected += 1;
        else itemAffected += 1;
      }
    }
  }
  assert.ok(weaponAffected > 0, "权重变化应影响部分角色的武器排序");
  assert.ok(itemAffected > 0, "权重变化应影响部分角色的道具排序（R4 要求覆盖道具）");
  console.log(`[P1-9] 权重变化报告：statSynergy×2 影响 ${affected.length} 个角色场景（武器 ${weaponAffected}、道具 ${itemAffected}，含排序原因）`);
}

console.log("Recommendation regression tests passed");
