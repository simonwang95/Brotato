import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));

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
assert.equal(localization.summary.byKind.character.total, 64);
assert.equal(
  localization.summary.byKind.character.localized,
  44,
  "official character localization should track confirmed names without hiding gaps",
);

{
  const weapon = localization.entries.WEAPON_GHOST_SCEPTER;
  assert.equal(weapon.cnName, "幽魂节杖");
  assert.equal(weapon.source, "manual-override");
}

{
  const weapon = localization.entries.WEAPON_RAIL_GUN;
  assert.equal(weapon.cnName, "磁轨炮");
  assert.equal(weapon.source, "translation-join");
}

{
  const item = localization.entries.ITEM_HUNTING_TROPHY;
  assert.equal(item.cnName, "狩猎战利品");
}

{
  const character = localization.entries.CHARACTER_BABY;
  assert.equal(character.cnName, "宝宝");
  assert.equal(character.source, "translation-join");
}

{
  const character = localization.entries.CHARACTER_BEAST_MASTER;
  assert.equal(character.cnName, null);
  assert.equal(character.source, "missing");
}

console.log("official localization tests passed");
