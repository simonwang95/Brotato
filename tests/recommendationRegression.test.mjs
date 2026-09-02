import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  generateStrategyGuide,
  getAvailableCharacters,
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
  "druid:normal20": {
    weapons: ["sickle", "pruner", "wand", "WEAPON_LUTE", "WEAPON_TORCH"],
    items: [
      "crystal",
      "penguin",
      "cauldron",
      "ITEM_PEARL",
      "ITEM_PIGGY_BANK",
      "ITEM_SNAKE",
      "ITEM_CROWN",
      "ITEM_EYES_SURGERY",
    ],
  },
  "druid:endless": {
    weapons: ["sickle", "pruner", "wand", "WEAPON_LUTE", "WEAPON_TORCH"],
    items: [
      "crystal",
      "penguin",
      "cauldron",
      "ITEM_PEARL",
      "ITEM_EYES_SURGERY",
      "ITEM_PIGGY_BANK",
      "ITEM_SNAKE",
      "ITEM_CROWN",
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
    items: [
      "crystal",
      "penguin",
      "cauldron",
      "ITEM_SNAKE",
      "ITEM_EYES_SURGERY",
      "ITEM_CHARCOAL",
      "ITEM_ICE_CUBE",
      "ITEM_PEARL",
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

// P1-9 / R4：全部 64 个官方角色的独立专家基准（fixture 与输出解耦，非循环论证）。
// 正向（mustInclude）：fixture 中记录的核心候选（含排名）必须出现在输出中，且排名不越界；
// 负向（mustExclude）：官方目录中该角色的禁用项不得出现（大小写统一后再比较）。
// fixture 存于 tests/fixtures/recommendationBaseline.json（独立于运行时输出）。
{
  const fixture = JSON.parse(readFileSync("tests/fixtures/recommendationBaseline.json", "utf8"));
  // 大小写统一：手写 id 与官方 nameKey 都归一到大写后再比较（R4 要求）。
  const norm = (id) => String(id).toUpperCase();
  let positiveChecked = 0;
  let negativeChecked = 0;
  let rankChecked = 0;
  for (const character of getAvailableCharacters()) {
    for (const modeId of ["normal20", "endless"]) {
      const guide = generateStrategyGuide(character.id, modeId, { officialCatalog });
      // 输出候选：武器 + 道具，按出现顺序记录排名（1-based）。
      const outputWeapons = guide.recommendedWeapons.map((c) => norm(c.weaponId ?? c.itemId ?? c.official?.nameKey));
      const outputItems = guide.keyItems.map((c) => norm(c.weaponId ?? c.itemId ?? c.official?.nameKey));
      const outputAll = new Set([...outputWeapons, ...outputItems]);
      const entry = fixture[`${character.id}:${modeId}`];
      if (!entry) {
        assert.fail(`${character.id}:${modeId} 缺少 fixture 条目（应覆盖全部角色/模式）`);
      }
      // 正向：核心候选必须出现，且排名不越界。
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
      // 负向：官方禁用项不得出现。
      for (const bannedId of entry.mustExclude ?? []) {
        assert.ok(!outputAll.has(norm(bannedId)), `${character.id}:${modeId} 不应推荐官方禁用项 ${bannedId}`);
        negativeChecked += 1;
      }
    }
  }
  assert.ok(positiveChecked > 0, "应检查到正向基准");
  console.log(`[P1-9] 64 角色独立基准：正向 ${positiveChecked} 项（含排名 ${rankChecked}）、负向 ${negativeChecked} 项，全部通过`);
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
