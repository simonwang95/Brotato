import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));

assert.ok(catalog.summary.total >= 500, "catalog should include base game and DLC records");
assert.ok(catalog.summary.byKind.item > 200, "catalog should include item records");
assert.ok(catalog.summary.byKind.weapon > 200, "catalog should include weapon records");

{
  const lute = catalog.records.find((record) => record.id === "weapon_lute_1");
  assert.equal(lute?.sourcePackage, "abyssalTerrors");
  assert.equal(lute?.nameKey, "WEAPON_LUTE");
  assert.equal(lute?.unlockedByDefault, true);
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

console.log("official catalog tests passed");
