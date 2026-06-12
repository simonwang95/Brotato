import assert from "node:assert/strict";
import {
  formatStatPriority,
  generateStrategyGuide,
  getAvailableCharacters,
  getAvailableModes,
  validateStrategyData,
} from "../src/strategyGenerator.js";

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
  assert.equal(formatStatPriority("lifeSteal 或 hpRegen"), "生命窃取 % 或 生命再生");
}

{
  const guide = generateStrategyGuide("lucky", "endless");
  assert.equal(guide.character.name, "Lucky");
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Slingshot"),
    "lucky endless guide should recommend Slingshot",
  );
  assert.ok(
    guide.recommendedWeapons.some(({ weapon }) => weapon.name === "Lute" && weapon.cnName === "琉特琴"),
    "lucky endless guide should recommend Lute",
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
    guide.wave20Targets.some(({ label, value }) => label === "幸运" && value === "180 - 320"),
    "lucky endless guide should expose high luck targets",
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
