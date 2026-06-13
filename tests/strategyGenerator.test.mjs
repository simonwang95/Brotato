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

{
  const errors = validateStrategyData();
  assert.deepEqual(errors, [], "strategy data should be internally consistent");
}

{
  const characters = getAvailableCharacters();
  assert.ok(characters.length >= 6, "seed guide pack should include starter roles plus engineer");
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
    guide.keyItems.some(({ item }) => item.name === "Night Goggles"),
    "ranger guide should include its character unlock item",
  );
  assert.ok(
    guide.keyItems.some(
      ({ item }) => item.name === "Night Goggles" && item.cnName === "夜视镜",
    ),
    "key items should expose Chinese translations",
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
  assert.throws(
    () => generateStrategyGuide("unknown", "normal20"),
    /Unknown character id/,
    "unknown character ids should fail loudly",
  );
}

console.log("strategy generator tests passed");
