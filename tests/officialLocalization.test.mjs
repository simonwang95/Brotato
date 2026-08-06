import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));

assert.equal(localization.sourceMetadata.productVersion, "1.1.12.0.beta-3");
assert.equal(localization.sourceMetadata.packages.length, 2);

assert.equal(
  localization.summary.byKind.weapon.localized,
  localization.summary.byKind.weapon.total,
  "official localization should cover all weapon names",
);
assert.equal(
  localization.summary.byKind.item.localized,
  localization.summary.byKind.item.total,
  "official localization should cover all item names",
);
assert.equal(localization.summary.localized, localization.summary.total);
assert.equal(localization.summary.missing, 0);
assert.equal(localization.summary.bySource["translation-key"], 386);
assert.equal(localization.summary.bySource["manual-override"], 1);
assert.ok(
  Object.values(localization.entries).every((entry) => entry.cnName),
  "every official catalog name key should have a verified Chinese name",
);
assert.equal(localization.summary.byKind.character.total, 64);
assert.equal(
  localization.summary.byKind.character.localized,
  64,
  "official character localization should cover every catalog key from static translations",
);

{
  const weapon = localization.entries.WEAPON_GHOST_SCEPTER;
  assert.equal(weapon.cnName, "幽魂节杖");
  assert.equal(weapon.source, "translation-key");
}

{
  const weapon = localization.entries.WEAPON_RAIL_GUN;
  assert.equal(weapon.cnName, "磁轨炮");
  assert.equal(weapon.source, "translation-key");
}

{
  const item = localization.entries.ITEM_HUNTING_TROPHY;
  assert.equal(item.cnName, "狩猎战利品");
}

{
  const character = localization.entries.CHARACTER_BABY;
  assert.equal(character.cnName, "宝宝");
  assert.equal(character.source, "translation-key");
}

{
  const character = localization.entries.CHARACTER_BEAST_MASTER;
  assert.equal(character.cnName, "驯兽师");
  assert.equal(character.source, "translation-key");
}

{
  const character = localization.entries.CHARACTER_WOUNDED;
  assert.equal(character.cnName, "伤者");
  assert.equal(character.source, "translation-key");
}

{
  const item = localization.entries.ITEM_CATLING_GUN;
  assert.equal(item.cnName, "猫特林机枪");
  assert.equal(item.source, "translation-key");
}

{
  const fallback = localization.entries.ITEM_RETROMATIONS_HOODIE;
  assert.equal(fallback.cnName, "Retromation的连帽衫");
  assert.equal(fallback.source, "manual-override");
}

console.log("official localization tests passed");
