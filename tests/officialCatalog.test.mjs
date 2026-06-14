import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));

assert.ok(catalog.summary.total >= 500, "catalog should include base game and DLC records");
assert.ok(catalog.summary.byKind.item > 200, "catalog should include item records");
assert.ok(catalog.summary.byKind.weapon > 200, "catalog should include weapon records");
assert.ok(catalog.summary.byKind.character > 60, "catalog should include character records");

{
  const lute = catalog.records.find((record) => record.id === "weapon_lute_1");
  assert.equal(lute?.sourcePackage, "abyssalTerrors");
  assert.equal(lute?.nameKey, "WEAPON_LUTE");
  assert.equal(lute?.unlockedByDefault, true);
  assert.equal(
    lute?.iconResourcePath,
    "res://dlcs/dlc_1/weapons/melee/lute/lute_icon.png",
  );
  assert.equal(lute?.expectedImageAssetPath, "data/assets/weapons/weapon_lute_1.png");
  assert.equal(lute?.stats?.damage, 4);
  assert.equal(lute?.stats?.cooldown, 45);
  assert.deepEqual(lute?.stats?.scalingStats, [
    { stat: "stat_melee_damage", value: 0.5 },
    { stat: "stat_luck", value: 0.1 },
  ]);
}

{
  const babyWithABeard = catalog.records.find(
    (record) => record.id === "item_baby_with_a_beard",
  );
  assert.equal(babyWithABeard?.sourcePackage, "base");
  assert.equal(babyWithABeard?.nameKey, "ITEM_BABY_WITH_A_BEARD");
  assert.equal(babyWithABeard?.tier, 2);
}

{
  const luckyCharm = catalog.records.find((record) => record.id === "item_lucky_charm");
  assert.equal(luckyCharm?.unlockedByDefault, false);
  assert.equal(luckyCharm?.value, 75);
}

{
  const cyberball = catalog.records.find((record) => record.id === "item_cyberball");
  assert.equal(cyberball?.iconResourcePath, "res://items/all/cyberball/cyberball_icon.png");
  assert.equal(cyberball?.expectedImageAssetPath, "data/assets/items/item_cyberball.png");
  assert.equal(cyberball?.effects?.[0]?.key, "stat_luck");
  assert.equal(cyberball?.effects?.[0]?.chance, 25);
  assert.equal(cyberball?.effects?.[0]?.value, 25);
}

{
  const lucky = catalog.records.find((record) => record.id === "character_lucky");
  assert.equal(lucky?.nameKey, "CHARACTER_LUCKY");
  assert.equal(lucky?.iconResourcePath, "res://items/characters/lucky/lucky_icon.png");
  assert.equal(lucky?.expectedImageAssetPath, "data/assets/characters/character_lucky.png");
  assert.equal(lucky?.effects?.find((effect) => effect.key === "stat_luck")?.value, 100);
  assert.equal(
    lucky?.effects?.find((effect) => effect.customKey === "dmg_when_pickup_gold")?.chance,
    75,
  );
}

console.log("official catalog tests passed");
