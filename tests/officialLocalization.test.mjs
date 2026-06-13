import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));

assert.ok(
  localization.summary.localized >= 220,
  "official localization should cover the majority of catalog names",
);
assert.equal(
  localization.summary.byKind.weapon.localized,
  78,
  "official localization should cover all currently verified weapon names",
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

console.log("official localization tests passed");
