import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  formatStatPriority,
  generateStrategyGuide,
  getAvailableCharacters,
  getAvailableDangerLevels,
  getAvailableDlcOptions,
  getAvailableModes,
  getAvailablePreferences,
  getAvailableUnlockOptions,
  validateStrategyData,
} from "../src/strategyGenerator.js";

const officialCatalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const officialLocalization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));
const officialUnlocks = JSON.parse(readFileSync("data/official-unlocks.json", "utf8"));

{
  const errors = validateStrategyData();
  assert.deepEqual(errors, [], "strategy data should be internally consistent");
}

{
  const characters = getAvailableCharacters();
  assert.ok(characters.length >= 59, "guide pack should include original and DLC rosters");
  const characterIds = new Set(characters.map((character) => character.id));
  [
    "sailor",
    "captain",
    "builder",
    "chef",
    "diver",
    "curious",
    "ogre",
    "dwarf",
    "creature",
    "gangster",
    "romantic",
    "druid",
    "hiker",
    "buccaneer",
    "baby",
    "technomage",
    "vagabond",
    "vampire",
  ].forEach((characterId) => {
    assert.ok(characterIds.has(characterId), `${characterId} guide should be present`);
  });
  assert.ok(
    characters.some((character) => character.id === "ranger"),
    "ranger guide should be present",
  );
  assert.ok(
    characters.some(
      (character) => character.id === "crazy" && character.cnHint === "狂战士，暴击近战",
    ),
    "crazy should expose Chinese name and archetype",
  );
  assert.ok(
    characters.some(
      (character) => character.id === "lucky" && character.cnHint === "幸运星，拾取触发流派",
    ),
    "lucky should expose Chinese name and archetype",
  );
  assert.ok(
    characters.some(
      (character) => character.id === "technomage" && character.cnHint === "科技法师，元素结构",
    ),
    "technomage should use the verified static Chinese character name",
  );
  assert.ok(
    characters.some((character) => character.id === "chunky" && character.cnHint === "大壮，生命坦克"),
    "chunky should expose Chinese name and archetype",
  );
  assert.ok(
    characters.some((character) => character.id === "demon" && character.cnHint === "恶魔，生命经济"),
    "demon should expose Chinese name and archetype",
  );
  assert.ok(
    !characters.some((character) => character.id === "giant"),
    "Giant should be hidden from normal strategy and simulator selectors",
  );
  const giant = getAvailableCharacters({ includeAuditedCatalogGaps: true }).find(
    (character) => character.id === "giant",
  );
  assert.equal(
    giant?.catalogStatus,
    "audited-catalog-gap",
    "Giant should remain an explicitly audited catalog gap",
  );
  assert.match(
    giant?.unlock ?? "",
    /CHARACTER_GIANT/,
    "Giant should expose the static audit boundary instead of an invented unlock",
  );
  assert.ok(
    characters.some((character) => character.id === "sailor" && character.cnHint.startsWith("水手")),
    "DLC sailor guide should be present with Chinese name",
  );
  assert.ok(
    characters.some((character) => character.id === "buccaneer" && character.cnHint.startsWith("海盗")),
    "DLC buccaneer guide should be present with Chinese name",
  );
}

{
  const verifiedOfficialGuides = [
    ["baby", /第 6 波前达到 10 等级/],
    ["technomage", /10 元素伤害.*3 个构筑物/],
    ["vagabond", /6 个不同的武器/],
    ["vampire", /40% 生命窃取/],
    ["chef", /至少 25 个敌人处于燃烧状态/],
    ["diver", /超过 700 范围的 1000 个敌人/],
    ["druid", /第 20 波.*250 个消耗品/],
    ["dwarf", /近战攻击击中至少 25 个敌人/],
    ["gangster", /单个商店中刷新 10 次/],
    ["hiker", /行走 20000 步/],
    ["ogre", /单次攻击.*1000 伤害/],
    ["romantic", /0 诅咒完成一场比赛/],
  ];

  verifiedOfficialGuides.forEach(([characterId, unlockPattern]) => {
    const guide = generateStrategyGuide(characterId, "normal20", { officialCatalog });
    assert.match(
      guide.character.unlock,
      unlockPattern,
      `${characterId} should use verified static unlock text`,
    );
    assert.ok(guide.recommendedWeapons.length > 0, `${characterId} should have weapon guidance`);
    assert.ok(guide.keyItems.length > 0, `${characterId} should have item guidance`);
  });
}

{
  const glutton = generateStrategyGuide("glutton", "normal20", { officialCatalog });
  assert.match(glutton.character.unlock, /拾取 20 个消耗品/);
  assert.doesNotMatch(glutton.character.unlock, /20 把武器/);
}

{
  const beastMaster = generateStrategyGuide("beastMaster", "normal20", { officialCatalog });
  assert.equal(beastMaster.character.name, "Beast Master");
  assert.match(beastMaster.character.unlock, /解锁猫特林机枪/);
  assert.equal(
    beastMaster.recommendedWeapons.length,
    0,
    "Beast Master official weapon_slot=0 should not receive weapon recommendations",
  );
  assert.match(beastMaster.weaponRouteNote, /weapon_slot=0/);
  assert.ok(
    beastMaster.keyItems.some(({ item }) => item.name === "Catling Gun"),
    "Beast Master should recommend its official starting pet route",
  );
  assert.ok(
    beastMaster.keyItems.every(({ item }) => !["Jelly", "Glasses"].includes(item.name)),
    "Beast Master should not recommend its banned items",
  );
  assert.ok(
    beastMaster.keyItems.some(({ recommendationReasons }) =>
      recommendationReasons.some((reason) => reason.includes("单宠物静态攻击参数")),
    ),
    "Beast Master pet recommendations should explain static pet parameter scoring",
  );
  const botOMine = beastMaster.keyItems.find(({ item }) => item.name === "Bot-O-Mine");
  const botOMineScenarioReason = botOMine?.recommendationReasons.find((reason) =>
    reason.includes("单宠物静态攻击参数"),
  );
  assert.match(botOMineScenarioReason ?? "", /约 114\.1 DPS/);
  assert.doesNotMatch(botOMineScenarioReason ?? "", /1753\.1 DPS/);

  const wounded = generateStrategyGuide("wounded", "normal20", { officialCatalog });
  assert.equal(wounded.character.name, "Wounded");
  assert.match(wounded.character.unlock, /噩梦难度/);
  assert.ok(
    wounded.keyItems.some(({ item }) => item.name === "Tardigrade"),
    "Wounded should expose its official starting Tardigrade protection",
  );
  assert.ok(
    wounded.keyItems.every(
      ({ official }) =>
        !official.records.some((record) =>
          [
            "item_armor",
            "item_max_hp",
            "item_hp_regeneration",
            "item_lifesteal",
            "item_whetstone",
          ].includes(record.id),
        ),
    ),
    "Wounded should filter official banned sustain and armor items",
  );
  assert.ok(
    wounded.recommendedWeapons.some(({ weapon }) => weapon.name === "SMG"),
    "Wounded should retain a ranged route",
  );
  assert.ok(
    !wounded.recommendedWeapons.some(({ weapon }) => weapon.name === "Sword"),
    "Wounded should not be pushed into an untracked melee route",
  );
}

{
  const regressionCases = [
    ["lucky", "endless", { preferenceId: "damage" }],
    ["knight", "normal20", { dlcOptionId: "baseOnly", preferenceId: "melee" }],
    ["ghost", "normal20", { unlockOptionId: "defaultOnly" }],
    ["engineer", "normal20", { preferenceId: "engineering" }],
    ["druid", "normal20", { preferenceId: "elemental" }],
    ["beastMaster", "endless", {}],
    ["wounded", "endless", { preferenceId: "ranged", unlockOptionId: "defaultOnly" }],
  ];

  for (const [characterId, modeId, options] of regressionCases) {
    const input = { officialCatalog, ...options };
    const guide = generateStrategyGuide(characterId, modeId, input);
    const rerun = generateStrategyGuide(characterId, modeId, input);
    assert.equal(guide.mode.id, modeId, `${characterId} should preserve its regression mode`);
    assert.deepEqual(
      guide.recommendedWeapons.slice(0, 3).map(({ weapon }) => weapon.name),
      rerun.recommendedWeapons.slice(0, 3).map(({ weapon }) => weapon.name),
      `${characterId} top weapon recommendations should remain stable`,
    );
    assert.ok(guide.keyItems.length > 0, `${characterId} should expose key item guidance`);
    assert.ok(
      guide.keyItems.every(({ recommendationScore, recommendationReasons }) =>
        Number.isFinite(recommendationScore) && recommendationReasons.length > 0,
      ),
      `${characterId} key items should expose finite, explainable scores`,
    );
  }
}

{
  const modes = getAvailableModes();
  assert.deepEqual(
    modes.map((mode) => mode.id),
    ["normal20", "endless"],
    "normal and endless modes should be available",
  );
}

{
  assert.ok(
    getAvailableDangerLevels().some((danger) => danger.id === "danger5"),
    "danger level input should include danger 5",
  );
  assert.ok(
    getAvailableDlcOptions().some((dlc) => dlc.id === "baseOnly"),
    "DLC input should support base-only filtering",
  );
  assert.ok(
    getAvailableUnlockOptions().some((unlock) => unlock.id === "defaultOnly"),
    "unlock input should support default-pool filtering",
  );
  assert.ok(
    getAvailablePreferences().some((preference) => preference.id === "engineering"),
    "preference input should include engineering route",
  );
}

{
  const guide = generateStrategyGuide("ranger", "endless");
  assert.equal(guide.character.name, "Ranger");
  assert.equal(guide.mode.id, "endless");
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "SMG"),
    "ranger endless guide should recommend SMG",
  );
  assert.ok(
    guide.recommendedWeapons.some(
      ({ weapon }) => weapon.name === "SMG" && weapon.cnName === "冲锋枪",
    ),
    "recommended weapons should expose Chinese translations",
  );
  assert.ok(
    guide.recommendedWeapons.every(({ weapon }) => weapon.statNote),
    "recommended weapons should expose stat notes",
  );
  assert.ok(
    guide.recommendedWeapons.every(({ recommendationScore }) => Number.isFinite(recommendationScore)),
    "recommended weapons should expose recommendation scores",
  );
  assert.ok(
    guide.recommendedWeapons.every(({ recommendationReasons }) => Array.isArray(recommendationReasons)),
    "recommended weapons should expose recommendation reasons",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Night Goggles"),
    "ranger guide should include its character unlock item",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Ricochet"),
    "ranger endless guide should include Ricochet for ranged coverage",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Bandana"),
    "ranger endless guide should include Bandana for pierce coverage",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item }) => item.name === "Night Goggles" && item.cnName === "夜视镜",
    ),
    "key items should expose Chinese translations",
  );
  assert.ok(
    guide.keyItems.every(({ item }) => item.statNote),
    "key items should expose stat notes",
  );
  assert.ok(
    guide.keyItems.every(({ recommendationScore }) => Number.isFinite(recommendationScore)),
    "key items should expose recommendation scores",
  );
  assert.ok(
    guide.statPriority.early.includes("远程伤害"),
    "stat priorities should be formatted as Chinese labels",
  );
  assert.ok(guide.wave20Targets.length > 5, "guide should expose wave 20 stat targets");
}

{
  const guide = generateStrategyGuide("chunky", "normal20");
  assert.equal(guide.character.name, "Chunky");
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Rock"),
    "chunky guide should recommend Rock",
  );
  assert.ok(
    guide.wave20Targets.some(({ label, value }) => label === "最大生命" && value === "90 - 130"),
    "chunky guide should expose high hp targets",
  );
}

{
  const guide = generateStrategyGuide("speedy", "normal20", { officialCatalog });
  const powerGenerator = guide.keyItems.find(({ item }) => item.name === "Power Generator");
  assert.ok(powerGenerator, "speedy should include Power Generator as a speed-scaling item");
  assert.ok(
    powerGenerator.recommendationReasons.some((reason) =>
      reason.includes("官方自定义成长随移速"),
    ),
    "speedy power generator should explain official custom growth source",
  );
  assert.ok(
    powerGenerator.recommendationReasons.some((reason) =>
      reason.includes("官方自定义成长潜力"),
    ),
    "speedy power generator should expose scenario custom-growth utility",
  );
}

{
  const guide = generateStrategyGuide("knight", "normal20", { officialCatalog });
  assert.equal(
    guide.recommendedWeapons[0].weapon.name,
    "Sword",
    "knight should prefer Sword as the armor melee route",
  );
  assert.equal(guide.recommendedWeapons[0].weapon.cnName, "剑");
  assert.ok(
    guide.recommendedWeapons[0].weapon.setNote.includes("剑类"),
    "Sword recommendation should expose its weapon set effect",
  );
  assert.ok(
    guide.recommendedWeapons[0].recommendationReasons.some((reason) =>
      reason.includes("套装修正：剑类 / 中世纪"),
    ),
    "Sword recommendation should explain blade and medieval set fit",
  );
  assert.ok(
    guide.recommendedWeapons[0].recommendationReasons.some((reason) =>
      reason.includes("稀有度修正：最低 T2"),
    ),
    "Sword recommendation should explain tier availability",
  );
  assert.ok(
    guide.recommendedWeapons[0].recommendationReasons.some((reason) =>
      reason.includes("目标护甲 19 按官方每 1 护甲 +2 近战伤害，约 +38"),
    ),
    "Sword recommendation should quantify Knight's official armor conversion",
  );
  assert.ok(
    guide.recommendedWeapons.every(({ official }) =>
      official.records.every((record) => record.weaponType !== 1),
    ),
    "Knight's official no-ranged rule should remove ranged weapon candidates",
  );
  const spikyShield = guide.recommendedWeapons.find(({ weapon }) => weapon.name === "Spiky Shield");
  assert.ok(
    spikyShield,
    "knight should include Spiky Shield as an armor-scaling weapon",
  );
  assert.ok(
    spikyShield.recommendationReasons.some((reason) => reason.includes("官方护甲缩放")),
    "spiky shield should explain official armor scaling",
  );
}

{
  const guide = generateStrategyGuide("hunter", "normal20", { officialCatalog });
  assert.equal(
    guide.recommendedWeapons[0].weapon.name,
    "Crossbow",
    "hunter should prefer Crossbow as its range/crit route",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Sniper Gun"),
    "hunter should include Sniper Gun as an unlock route",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Scope" && item.cnName === "瞄准镜"),
    "hunter should include Scope for range and ranged damage",
  );
}

{
  const guide = generateStrategyGuide("renegade", "normal20", { officialCatalog });
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Ricochet" && item.cnName === "跳弹"),
    "renegade should include Ricochet for multi-projectile coverage",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Bandana" && item.cnName === "头巾"),
    "renegade should include Bandana for pierce coverage",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item, recommendationReasons }) =>
        item.name === "Bandana" &&
        recommendationReasons.some((reason) => reason.includes("贯通覆盖潜力")),
    ),
    "renegade bandana recommendation should explain official piercing coverage utility",
  );
}

{
  const guide = generateStrategyGuide("crazy", "normal20", { officialCatalog });
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Shuriken"),
    "crazy should include Shuriken as a precise ranged branch",
  );
  const huntingTrophy = guide.keyItems.find(({ item }) => item.name === "Hunting Trophy");
  assert.ok(
    huntingTrophy?.recommendationReasons.some((reason) =>
      reason.includes("暴击击杀材料"),
    ),
    "crazy hunting trophy recommendation should explain crit-kill economy utility",
  );
}

{
  const guide = generateStrategyGuide("lucky", "normal20", { officialCatalog });
  const metalDetector = guide.keyItems.find(({ item }) => item.name === "Metal Detector");
  assert.ok(
    metalDetector?.recommendationReasons.some((reason) =>
      reason.includes("拾取双倍材料期望"),
    ),
    "lucky metal detector recommendation should explain double-material economy utility",
  );
}

{
  const guide = generateStrategyGuide("entrepreneur", "normal20", { officialCatalog });
  const treasureMap = guide.keyItems.find(({ item }) => item.name === "Treasure Map");
  assert.ok(treasureMap, "entrepreneur should surface Treasure Map from the official DLC item pool");
  assert.ok(
    treasureMap.recommendationReasons.some((reason) =>
      reason.includes("箱子额外道具期望 +0.20 随机道具/箱"),
    ),
    "treasure map should explain its official per-crate random-item expectation",
  );
}

{
  const guide = generateStrategyGuide("curious", "normal20", { officialCatalog });
  const whistle = guide.keyItems.find(({ item }) => item.name === "Whistle");
  assert.ok(whistle, "curious should surface Whistle from the official DLC item pool");
  assert.ok(
    whistle.recommendationReasons.some((reason) =>
      reason.includes("战利品外星人机会 +50% / 移速 +20%"),
    ),
    "whistle should explain both official opportunity and chase-speed risk fields",
  );
}

{
  const guide = generateStrategyGuide("farmer", "normal20", { officialCatalog });
  const crown = guide.keyItems.find(({ item }) => item.name === "Crown");
  assert.ok(crown, "farmer guide should surface Crown from the official item candidate pool");
  assert.ok(
    crown.recommendationReasons.some((reason) => reason.includes("收获成长等效")),
    "farmer crown recommendation should explain harvesting growth utility",
  );
  assert.ok(
    crown.recommendationReasons.some((reason) =>
      reason.includes("收获成长加速经济滚雪球"),
    ),
    "farmer crown recommendation should explain its economy-growth mechanic",
  );
  const bag = guide.keyItems.find(({ item }) => item.name === "Bag");
  assert.ok(bag, "farmer guide should surface Bag from the official item candidate pool");
  assert.ok(
    bag.recommendationReasons.some((reason) => reason.includes("箱子材料潜力")),
    "farmer bag recommendation should explain crate material utility",
  );
  const piggyBank = guide.keyItems.find(({ item }) => item.name === "Piggy Bank");
  assert.ok(
    piggyBank?.recommendationReasons.some((reason) => reason.includes("波次存钱潜力")),
    "farmer piggy bank recommendation should explain start-wave savings utility",
  );
  const recyclingMachine = guide.keyItems.find(
    ({ item }) => item.name === "Recycling Machine",
  );
  assert.ok(
    recyclingMachine?.recommendationReasons.some((reason) =>
      reason.includes("单次回收额外材料 +35/次"),
    ),
    "farmer should surface official per-recycle material value without treating it as a percent",
  );
  const lure = guide.keyItems.find(({ item }) => item.name === "Lure");
  assert.ok(
    lure?.recommendationReasons.some((reason) =>
      reason.includes("下一波战利品外星人 +2"),
    ),
    "farmer should explain the official fixed next-wave loot-alien count",
  );
  const coupon = guide.keyItems.find(({ item }) => item.name === "Coupon");
  assert.ok(
    coupon?.recommendationReasons.some((reason) => reason.includes("商店效率潜力 物品折扣 5%")),
    "farmer coupon recommendation should explain official shop discount utility",
  );

  const nextWaveCatalog = JSON.parse(JSON.stringify(officialCatalog));
  const nextWaveLocalization = JSON.parse(JSON.stringify(officialLocalization));
  nextWaveCatalog.records.push({
    id: "item_test_next_xp",
    kind: "item",
    sourcePackage: "base",
    nameKey: "ITEM_TEST_NEXT_XP",
    tier: 0,
    value: 1,
    unlockedByDefault: true,
    canBeLooted: true,
    setPaths: [],
    effects: [
      {
        key: "xp_gain",
        textKey: "effect_stat_next_wave",
        value: 100,
        customKey: "stats_next_wave",
      },
      {
        key: "enemy_damage",
        textKey: "effect_stat_next_wave",
        value: 50,
        customKey: "stats_next_wave",
      },
    ],
  });
  nextWaveLocalization.entries.ITEM_TEST_NEXT_XP = {
    enName: "Test Next Xp",
    cnName: "测试下一波经验",
  };
  const nextWaveGuide = generateStrategyGuide("farmer", "normal20", {
    officialCatalog: nextWaveCatalog,
    officialLocalization: nextWaveLocalization,
  });
  const nextWaveXp = nextWaveGuide.keyItems.find(({ item }) => item.name === "Test Next Xp");
  assert.ok(
    nextWaveXp?.recommendationReasons.some((reason) =>
      reason.includes("下一波经验潜力 XP +100% / 敌人伤害 +50%"),
    ),
    "farmer should explain official next-wave xp effects as risk-adjusted economy utility",
  );
}

{
  const guide = generateStrategyGuide("lucky", "normal20", { officialCatalog });
  const pearl = guide.keyItems.find(({ item }) => item.name === "Pearl");
  assert.ok(pearl, "lucky should surface Pearl from the official DLC item pool");
  assert.ok(
    pearl.recommendationReasons.some((reason) =>
      reason.includes("官方自定义成长潜力 随幸运"),
    ),
    "pearl should retain its official luck-growth explanation",
  );
  assert.ok(
    pearl.recommendationReasons.some((reason) =>
      reason.includes("每箱 0.03 个同名道具期望"),
    ),
    "pearl should separately explain its official three-percent crate opportunity",
  );
}

{
  const luckyUnlock = officialUnlocks.records.find((record) => record.characterId === "lucky");
  const lucky = getAvailableCharacters().find((character) => character.id === "lucky");
  assert.equal(luckyUnlock?.zhDescription, "搜集300材料");
  assert.match(lucky?.unlock ?? "", /300 材料/);
  assert.doesNotMatch(lucky?.unlock ?? "", /待校验|待补/);
}

{
  assert.deepEqual(
    officialUnlocks.summary.pendingBySourcePackage,
    {},
    "all currently extracted character unlock descriptions should be verified static text",
  );
  assert.equal(officialUnlocks.summary.verifiedStaticText, 54);
  assert.equal(officialUnlocks.summary.pendingText, 0);
  const buccaneerUnlock = officialUnlocks.records.find((record) => record.characterId === "buccaneer");
  const buccaneer = getAvailableCharacters().find((character) => character.id === "buccaneer");
  assert.equal(buccaneerUnlock?.descriptionKey, "CHAL_STAT_DESC");
  assert.equal(buccaneerUnlock?.zhDescription, "达到100%拾取范围");
  assert.equal(buccaneerUnlock?.extractionStatus, "verified-static-text");
  assert.match(buccaneer?.unlock ?? "", /100% 拾取范围/);
  assert.doesNotMatch(buccaneer?.unlock ?? "", /待校验|待补/);
  const chefUnlock = officialUnlocks.records.find((record) => record.characterId === "chef");
  assert.equal(chefUnlock?.challengeId, "chal_barbecue");
  assert.equal(chefUnlock?.descriptionKey, "CHAL_BARBECUE_DESC");
  assert.equal(chefUnlock?.value, 25);
  assert.equal(chefUnlock?.zhDescription, "同时让至少25个敌人处于燃烧状态");
  assert.equal(chefUnlock?.extractionStatus, "verified-static-text");
  assert.equal(chefUnlock?.pendingReason, undefined);
}

{
  const guide = generateStrategyGuide("ranger", "normal20", {
    officialCatalog,
    officialLocalization,
  });
  const officialCandidate = guide.recommendedWeapons.find((entry) => entry.officialCandidate);
  assert.ok(officialCandidate, "official catalog should expand the weapon recommendation pool");
  assert.ok(officialCandidate.weapon.cnName, "official weapon candidates should use localization");
  assert.ok(
    officialCandidate.official.records.some((record) => record.imageAssetPath),
    "official weapon candidates should keep compendium image metadata",
  );
  assert.ok(
    officialCandidate.recommendationReasons.some((reason) => reason.includes("场景模型：")),
    "official weapon candidates should expose scenario-model scoring reasons",
  );
}

{
  const guide = generateStrategyGuide("ghost", "normal20", { officialCatalog });
  assert.deepEqual(
    guide.recommendedWeapons.slice(0, 3).map(({ weapon }) => weapon.name),
    ["Ghost Axe", "Ghost Flint", "Ghost Scepter"],
    "ghost should recommend the ethereal weapon line",
  );
  assert.ok(
    guide.recommendedWeapons.every(({ weapon }) => weapon.setNote.includes("幽魂")),
    "ghost weapons should expose ethereal set notes",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.cnName === "幽魂节杖"),
    "ghost scepter should use the official Chinese name",
  );
  assert.ok(
    guide.recommendedWeapons.slice(0, 3).every(({ recommendationReasons }) =>
      recommendationReasons.some((reason) => reason.includes("幽魂击杀成长")),
    ),
    "ghost weapons should explain official kill-growth mechanics",
  );
  const growthReasons = Object.fromEntries(
    guide.recommendedWeapons.slice(0, 3).map(({ weapon, recommendationReasons }) => [
      weapon.name,
      recommendationReasons.find((reason) => reason.includes("幽魂击杀成长")),
    ]),
  );
  assert.match(growthReasons["Ghost Axe"] ?? "", /\+5\.0-8\.3 总伤害 %/);
  assert.match(growthReasons["Ghost Flint"] ?? "", /\+5\.0-8\.3 攻速 %/);
  assert.match(growthReasons["Ghost Scepter"] ?? "", /\+5\.0-8\.3 最大生命/);
  assert.ok(
    Object.values(growthReasons).every((reason) => reason?.includes("逐阶每 20-12 杀 +1")),
    "ethereal growth should retain the official T1-T4 kill thresholds",
  );
}

{
  assert.equal(formatStatPriority("lifeSteal 或 hpRegen"), "生命窃取 % 或 生命再生");
}

{
  const guide = generateStrategyGuide("lucky", "endless", { officialCatalog });
  assert.equal(guide.character.name, "Lucky");
  assert.equal(
    guide.recommendedWeapons[0].weapon.name,
    "Lute",
    "lucky endless guide should surface Lute first when DLC is allowed",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Slingshot"),
    "lucky endless guide should recommend Slingshot",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Lute" && weapon.cnName === "琉特琴"),
    "lucky endless guide should recommend Lute",
  );
  assert.ok(
    guide.recommendedWeapons.some(
      ({ weapon, official }) =>
        weapon.name === "Lute" && official.sourceLabel === "深海魔怪" && official.tierLabel === "T1-T4",
    ),
    "lucky lute recommendation should include official DLC catalog metadata",
  );
  assert.ok(
    guide.recommendedWeapons.some(
      ({ weapon, recommendationReasons }) =>
        weapon.name === "Lute" &&
        recommendationReasons.some(
          (reason) => reason.includes("官方数值匹配角色目标：") && reason.includes("幸运"),
        ),
    ),
    "lucky lute recommendation should explain official stat synergy",
  );
  assert.ok(
    guide.recommendedWeapons.some(
      ({ weapon, recommendationReasons }) =>
        weapon.name === "Lute" &&
        recommendationReasons.some((reason) => reason.includes("机制修正：百分比伤害")),
    ),
    "lucky lute recommendation should explain percent-damage trigger synergy",
  );
  assert.ok(
    guide.recommendedWeapons.some(
      ({ weapon, recommendationReasons }) =>
        weapon.name === "Lute" &&
        recommendationReasons.some((reason) => reason.includes("官方幸运缩放武器")),
    ),
    "lucky lute recommendation should explain official luck weapon scaling",
  );
  assert.ok(
    guide.recommendedWeapons.some(
      ({ weapon, recommendationReasons }) =>
        weapon.name === "Lute" &&
        recommendationReasons.some((reason) => reason.includes("价格修正：最低价格 15")),
    ),
    "lucky lute recommendation should explain early price fit",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Cyberball" && item.cnName === "赛博球"),
    "lucky guide should include Cyberball",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item }) => item.name === "Baby with a Beard" && item.cnName === "长胡子的婴儿",
    ),
    "lucky guide should include Baby with a Beard",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Baby Gecko" && item.cnName === "壁虎宝宝"),
    "lucky guide should include Baby Gecko",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item, recommendationReasons }) =>
        item.name === "Baby Gecko" &&
        recommendationReasons.some((reason) => reason.includes("拾取频率 +")),
    ),
    "lucky guide should explain Baby Gecko pickup utility",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Sifd's Relic" && item.cnName === "圣物"),
    "lucky guide should include Sifd's Relic",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item, recommendationReasons }) =>
        item.name === "Sifd's Relic" &&
        recommendationReasons.some((reason) =>
          reason.includes("幸运星官方拾取伤害 +161.4 DPS（拾取吸附 +100%）"),
        ),
    ),
    "lucky guide should quantify Sifd pickup-chain utility against the official character passive",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item, recommendationReasons }) =>
        item.name === "Lucky Charm" &&
        recommendationReasons.some((reason) =>
          reason.includes("幸运 +30 × 1.25"),
        ),
    ),
    "lucky guide should apply the official +25% luck-gain modifier to item luck",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item, recommendationReasons }) =>
        ["Adrenaline", "Jerky", "Weird Food", "Cute Monkey"].includes(item.name) &&
        recommendationReasons.some((reason) => /治疗期望|治疗潜力/.test(reason)),
    ),
    "lucky guide should surface official sustain candidates",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item, recommendationReasons }) =>
        item.name === "Jerky" &&
        recommendationReasons.some((reason) =>
          reason.includes("高密度怪潮 / 无尽消耗品治疗潜力 +2.63 生命/秒"),
        ),
    ),
    "lucky jerky recommendation should include official over-time consumable healing",
  );
  assert.ok(
    guide.statPriority.early.includes("总伤害 %"),
    "lucky guide should prioritize damage percent for item-trigger damage",
  );
  assert.ok(
    guide.wave20Targets.some(({ label, value }) => label === "幸运" && value === "300 - 550"),
    "lucky endless guide should expose higher luck targets",
  );
}

{
  const guide = generateStrategyGuide("lucky", "endless", {
    officialCatalog,
    dlcOptionId: "baseOnly",
  });
  assert.ok(
    !guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Lute"),
    "base-only DLC input should hide Lute",
  );
  assert.ok(
    guide.keyItems.every(({ item }) => !["Pearl", "Whistle", "Treasure Map"].includes(item.name)),
    "base-only input should hide DLC economy candidates",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Slingshot"),
    "base-only Lucky guide should keep base-game alternatives",
  );
}

{
  const guide = generateStrategyGuide("farmer", "normal20", {
    officialCatalog,
    unlockOptionId: "defaultOnly",
  });
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Recycling Machine"),
    "default-only input should keep the default-pool Recycling Machine",
  );
  assert.ok(
    guide.keyItems.every(({ item }) => !["Pearl", "Lure", "Treasure Map"].includes(item.name)),
    "default-only input should hide locked economy candidates",
  );
}

{
  const normal = generateStrategyGuide("lucky", "endless", {
    officialCatalog,
    dangerLevelId: "danger0",
  });
  const danger5 = generateStrategyGuide("lucky", "endless", {
    officialCatalog,
    dangerLevelId: "danger5",
  });
  const normalArmor = normal.wave20Targets.find(({ label }) => label === "护甲");
  const dangerArmor = danger5.wave20Targets.find(({ label }) => label === "护甲");
  assert.equal(normalArmor.value, "9 - 15");
  assert.equal(dangerArmor.value, "11 - 19");
}

{
  const guide = generateStrategyGuide("sailor", "normal20", { officialCatalog });
  assert.equal(guide.character.name, "Sailor");
  assert.equal(guide.recommendedWeapons[0].weapon.name, "Anchor");
  assert.equal(guide.recommendedWeapons[0].weapon.cnName, "锚");
  assert.ok(
    guide.recommendedWeapons[0].weapon.setNote.includes("海军"),
    "sailor anchor recommendation should expose naval set effect",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Coral" && item.cnName === "珊瑚"),
    "sailor should include Coral as a DLC route item",
  );
}

{
  const guide = generateStrategyGuide("captain", "normal20", {
    officialCatalog,
    unlockOptionId: "defaultOnly",
  });
  assert.ok(
    !guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Captain's Sword"),
    "default-only input should hide Captain's Sword because official catalog marks it locked",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Sword"),
    "captain guide should keep base-game sword fallback when unlocks are hidden",
  );
}

{
  const guide = generateStrategyGuide("captain", "normal20", { officialCatalog });
  const captainSword = guide.recommendedWeapons.find(
    ({ weapon }) => weapon.name === "Captain's Sword",
  );
  assert.ok(
    captainSword?.recommendationReasons.some((reason) => reason.includes("解锁修正：需解锁")),
    "Captain's Sword should explain locked-item availability",
  );
  assert.ok(
    captainSword?.recommendationReasons.some((reason) =>
      reason.includes("套装修正：海军 / 剑类"),
    ),
    "Captain's Sword should explain naval/blade set fit",
  );
}

{
  const guide = generateStrategyGuide("builder", "normal20", {
    officialCatalog,
    preferenceId: "engineering",
  });
  assert.equal(guide.character.name, "Builder");
  assert.equal(
    guide.keyItems[0].item.name,
    "Robot Arm",
    "builder should keep its core scaling item ahead of generic engineering keywords",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Robot Arm"),
    "builder should include Robot Arm for engineering scaling",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item, recommendationReasons }) =>
        item.name === "Robot Arm" &&
        recommendationReasons.some((reason) => reason.includes("每波成长 工程学 +3/波")),
    ),
    "builder robot arm recommendation should explain official end-wave engineering growth",
  );
  assert.ok(
    guide.recommendedWeapons.every(({ routeTags }) => routeTags?.includes("Engineering")),
    "builder recommendations should carry route tags for preference scoring",
  );
}

{
  const guide = generateStrategyGuide("mage", "normal20", { officialCatalog });
  const snake = guide.keyItems.find(({ item }) => item.name === "Snake");
  assert.ok(snake, "mage should include Snake as a burning spread item");
  assert.ok(
    snake.recommendationReasons.some((reason) => reason.includes("燃烧覆盖潜力")),
    "snake should explain official burning support utility",
  );
}

{
  const guide = generateStrategyGuide("ghost", "normal20", { officialCatalog });
  const adrenaline = guide.keyItems.find(({ item }) => item.name === "Adrenaline");
  assert.ok(adrenaline, "ghost guide should surface official dodge-heal sustain candidates");
  assert.ok(
    adrenaline.recommendationReasons.some((reason) => reason.includes("闪避治疗期望")),
    "adrenaline should explain dodge-heal sustain utility",
  );
}

{
  const guide = generateStrategyGuide("ogre", "normal20", { officialCatalog });
  const goblet = guide.keyItems.find(({ item }) => item.name === "Goblet");
  assert.ok(goblet, "ogre should retain Goblet as kill-heal sustain");
  assert.ok(
    goblet.recommendationReasons.some((reason) =>
      reason.includes("击杀治疗期望 +0.15 生命/秒"),
    ),
    "goblet should explain official kill-heal chance through the scenario kill rate",
  );
}

{
  const guide = generateStrategyGuide("crazy", "normal20", { officialCatalog });
  const tentacle = guide.keyItems.find(({ item }) => item.name === "Tentacle");
  assert.ok(tentacle, "high-crit routes should surface Tentacle from the official pool");
  assert.ok(
    tentacle.recommendationReasons.some((reason) =>
      reason.includes("暴击击杀治疗期望 +0.14 生命/秒"),
    ),
    "tentacle should combine its crit bonus with the character target crit rate",
  );
}

{
  const guide = generateStrategyGuide("druid", "normal20", { officialCatalog });
  const fruitBasket = guide.keyItems.find(({ item }) => item.name === "Fruit Basket");
  assert.ok(fruitBasket, "druid should surface Fruit Basket for its explicit consumable route");
  assert.ok(
    fruitBasket.recommendationReasons.some((reason) =>
      reason.includes("额外消耗品机会 +0.01/秒"),
    ),
    "fruit basket should explain extra drops without inventing healing per second",
  );
  assert.ok(
    fruitBasket.recommendationReasons.every(
      (reason) => !/官方数值匹配角色目标：.*生命再生/.test(reason),
    ),
    "fruit basket negative regeneration must not count as positive stat synergy",
  );
  const farmerGuide = generateStrategyGuide("farmer", "normal20", { officialCatalog });
  assert.ok(
    farmerGuide.keyItems.every(({ item }) => item.name !== "Fruit Basket"),
    "fruit basket should not displace stronger economy items without an explicit consumable route",
  );
}

{
  const guide = generateStrategyGuide("engineer", "normal20", { officialCatalog });
  const turret = guide.keyItems.find(({ item }) => item.name === "Turret");
  assert.ok(turret, "engineer should include Turret as a structure item");
  assert.ok(
    turret.recommendationReasons.some((reason) => reason.includes("结构物输出潜力")),
    "turret should explain official structure utility",
  );
}

{
  const guide = generateStrategyGuide("engineer", "normal20", {
    officialCatalog,
    preferenceId: "engineering",
  });
  const pileOfBooks = guide.keyItems.find(({ item }) => item.name === "Pile Of Books");
  assert.ok(pileOfBooks, "engineer should surface Pile Of Books as official structure crit support");
  assert.ok(
    pileOfBooks.recommendationReasons.some((reason) =>
      reason.includes("结构物暴击输出潜力（5% 暴击率）"),
    ),
    "pile of books should explain structure crit utility through the scenario model",
  );
}

{
  const guide = generateStrategyGuide("brawler", "normal20", { officialCatalog });
  const silverBullet = guide.keyItems.find(({ item }) => item.name === "Silver Bullet");
  const smallFish = guide.keyItems.find(({ item }) => item.name === "Small Fish");
  assert.ok(silverBullet, "damage routes should surface Silver Bullet from the official pool");
  assert.ok(smallFish, "damage routes should surface Small Fish from the official pool");
  assert.ok(
    silverBullet.recommendationReasons.some((reason) =>
      reason.includes("Boss 条件伤害潜力（+25% 对 Boss）"),
    ),
    "silver bullet should explain its official boss damage value",
  );
  assert.ok(
    smallFish.recommendationReasons.some((reason) =>
      reason.includes("高生命目标伤害潜力（+10% 高生命条件）"),
    ),
    "small fish should explain its official high-health damage value",
  );
  assert.ok(
    smallFish.recommendationReasons.every(
      (reason) => !/官方数值匹配角色目标：.*攻速/.test(reason),
    ),
    "small fish negative attack speed must not count as positive stat synergy",
  );
}

{
  const guide = generateStrategyGuide("wellRounded", "normal20", { officialCatalog });
  const trident = guide.recommendedWeapons.find(({ weapon }) => weapon.name === "Trident");
  assert.ok(trident, "official high-health weapon effects should remain in weapon candidates");
  assert.ok(
    trident.recommendationReasons.some((reason) =>
      reason.includes("条件伤害修正：普通清怪期望 +12.5%"),
    ),
    "trident should explain weighted high-health conditional damage",
  );
}

{
  const guide = generateStrategyGuide("giant", "normal20", { officialCatalog });
  const giantBelt = guide.keyItems.find(({ item }) => item.name === "Giant Belt");
  assert.ok(giantBelt, "giant should retain the manual Giant Belt recommendation");
  assert.ok(
    giantBelt.recommendationReasons.some((reason) =>
      reason.includes(
        "暴击高生命目标潜力（普通目标当前生命 10% / Boss 与精英 1% × 目标面板 0% 暴击率）",
      ),
    ),
    "giant belt should expose both official current-health percentages",
  );
  assert.ok(
    giantBelt.recommendationReasons.every((reason) => !reason.includes("触发伤害 0 DPS")),
    "zero modeled crit utility should not fall through to a misleading DPS explanation",
  );
}

{
  const guide = generateStrategyGuide("artificer", "normal20", { officialCatalog });
  const dynamite = guide.keyItems.find(({ item }) => item.name === "Dynamite");
  assert.ok(dynamite, "artificer should include Dynamite as an explosion item");
  assert.ok(
    dynamite.recommendationReasons.some((reason) => reason.includes("爆炸覆盖潜力")),
    "dynamite should explain official explosion utility",
  );
}

{
  const guide = generateStrategyGuide("chef", "normal20", {
    officialCatalog,
    preferenceId: "elemental",
  });
  assert.ok(
    ["Torch", "Wand"].includes(guide.recommendedWeapons[0].weapon.name),
    "elemental preference should surface elemental chef weapons",
  );
  assert.ok(
    guide.recommendedWeapons[0].recommendationReasons.some((reason) =>
      reason.includes("候选标签贴合偏好"),
    ),
    "preference scoring should explain why an elemental weapon was surfaced",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Cauldron" && item.cnName === "大锅"),
    "chef should include Cauldron for consumable scaling",
  );
}

{
  const guide = generateStrategyGuide("diver", "normal20", {
    officialCatalog,
    dlcOptionId: "baseOnly",
  });
  assert.ok(
    !guide.recommendedWeapons.some(({ official }) => official.sources?.includes("abyssalTerrors")),
    "base-only DLC input should hide DLC weapons even for a DLC character",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "SMG"),
    "diver should retain base-game ranged fallback when DLC weapons are hidden",
  );
}

{
  const guide = generateStrategyGuide("buccaneer", "normal20", { officialCatalog });
  assert.equal(guide.character.name, "Buccaneer");
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Harpoon Gun" && weapon.cnName === "鱼叉枪"),
    "buccaneer should include Harpoon Gun as a naval ranged route",
  );
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Black Flag" && item.cnName === "黑旗"),
    "buccaneer should include Black Flag for distance-kill economy",
  );
  const blackFlag = guide.keyItems.find(({ item }) => item.name === "Black Flag");
  assert.ok(
    blackFlag?.recommendationReasons.some((reason) => reason.includes("诅咒击杀材料潜力")),
    "black flag should explain official curse-kill economy utility",
  );
}

{
  const guide = generateStrategyGuide("captain", "normal20", { officialCatalog });
  const fishHook = guide.keyItems.find(({ item }) => item.name === "Fish Hook");
  assert.ok(fishHook, "captain should include Fish Hook as a curse-shop route item");
  assert.ok(
    fishHook.recommendationReasons.some((reason) => reason.includes("锁定物品诅咒潜力")),
    "fish hook should explain official curse-shop utility",
  );
}

{
  const guide = generateStrategyGuide("hiker", "normal20", { officialCatalog });
  assert.equal(guide.recommendedWeapons[0].weapon.name, "Hiking Stick");
  assert.equal(guide.recommendedWeapons[0].weapon.cnName, "登山杖");
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Sunken Bell" && item.cnName === "沉钟"),
    "hiker should include Sunken Bell for walking economy",
  );
}

{
  const guide = generateStrategyGuide("romantic", "normal20", { officialCatalog });
  assert.equal(guide.recommendedWeapons[0].weapon.name, "Flute");
  assert.equal(guide.recommendedWeapons[0].weapon.cnName, "长笛");
  assert.ok(
    guide.keyItems.some(({ item }) => item.name === "Goblet" && item.cnName === "高脚杯"),
    "romantic should include Goblet as a DLC sustain item",
  );
}

{
  const guide = generateStrategyGuide("creature", "normal20", {
    officialCatalog,
    unlockOptionId: "defaultOnly",
  });
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Sharp Tooth"),
    "default-only creature guide should keep Sharp Tooth",
  );
  assert.ok(
    !guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Claw"),
    "default-only creature guide should hide locked Claw",
  );
}

{
  assert.throws(
    () => generateStrategyGuide("unknown", "normal20"),
    /Unknown character id/,
    "unknown character ids should fail loudly",
  );
}

console.log("strategy generator tests passed");
