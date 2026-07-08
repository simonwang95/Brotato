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
    "giant",
    "ogre",
    "dwarf",
    "creature",
    "gangster",
    "romantic",
    "druid",
    "hiker",
    "buccaneer",
  ].forEach((characterId) => {
    assert.ok(characterIds.has(characterId), `${characterId} DLC guide should be present`);
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
    characters.some((character) => character.id === "chunky" && character.cnHint === "大壮，生命坦克"),
    "chunky should expose Chinese name and archetype",
  );
  assert.ok(
    characters.some((character) => character.id === "demon" && character.cnHint === "恶魔，生命经济"),
    "demon should expose Chinese name and archetype",
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
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Spiky Shield"),
    "knight should include Spiky Shield as an armor-scaling weapon",
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
}

{
  const guide = generateStrategyGuide("crazy", "normal20", { officialCatalog });
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Shuriken"),
    "crazy should include Shuriken as a precise ranged branch",
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
    { base: 2, abyssalTerrors: 9 },
    "pending unlock text should be tracked by source package",
  );
  const chefUnlock = officialUnlocks.records.find((record) => record.characterId === "chef");
  assert.equal(chefUnlock?.challengeId, "chal_barbecue");
  assert.equal(chefUnlock?.descriptionKey, "CHAL_BARBECUE_DESC");
  assert.equal(chefUnlock?.value, 25);
  assert.equal(chefUnlock?.extractionStatus, "pending-text");
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
    guide.keyItems.some(({ item }) => item.name === "Sifd's Relic" && item.cnName === "圣物"),
    "lucky guide should include Sifd's Relic",
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
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Slingshot"),
    "base-only Lucky guide should keep base-game alternatives",
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
    guide.recommendedWeapons.every(({ routeTags }) => routeTags?.includes("Engineering")),
    "builder recommendations should carry route tags for preference scoring",
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
