import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCompendium } from "../src/compendium.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));
const compendium = buildCompendium(catalog, localization);

assert.equal(compendium.characters.length, 59, "compendium should include the maintained roster");
assert.equal(compendium.weapons.length, 79, "weapon compendium should group all official weapons");
assert.equal(compendium.items.length, 244, "item compendium should group all official items");

{
  const lute = compendium.weapons.find((entry) => entry.nameKey === "WEAPON_LUTE");
  assert.equal(lute?.enName, "Lute");
  assert.equal(lute?.cnName, "琉特琴");
  assert.equal(lute?.sourceLabel, "深海魔怪");
  assert.equal(lute?.tierLabel, "T1-T4");
  assert.equal(lute?.valueLabel, "15-122");
  assert.ok(lute?.setLabels.includes("乐器"), "Lute should expose the musical set");
  assert.ok(lute?.setLabels.includes("支援"), "Lute should expose the support set");
  assert.ok(
    lute?.detailedAttributes.some((line) => line.includes("缩放：T1 50% 近战伤害，10% 幸运")),
    "Lute should expose tiered scaling stats",
  );
  assert.ok(
    lute?.detailedAttributes.some((line) => line.includes("伤害：T1 4 / T2 8")),
    "Lute should expose tiered damage stats",
  );
}

{
  const cyberball = compendium.items.find((entry) => entry.nameKey === "ITEM_CYBERBALL");
  assert.equal(cyberball?.cnName, "赛博球");
  assert.equal(cyberball?.valueLabel, "30");
  assert.equal(cyberball?.unlockLabel, "默认解锁");
  assert.match(cyberball?.strategyStatNote ?? "", /幸运拾取伤害/);
  assert.ok(
    cyberball?.detailedAttributes.includes("T2 击杀敌人时：25% 概率，造成 25% 幸运 的伤害"),
    "Cyberball should expose parsed trigger chance and luck scaling",
  );
}

{
  const slingshot = compendium.weapons.find((entry) => entry.nameKey === "WEAPON_SLINGSHOT");
  assert.ok(
    slingshot?.detailedAttributes.some((line) =>
      line.includes("弹射：T1 1，伤害保留 100% / T2 2"),
    ),
    "Slingshot should expose parsed bounce stats",
  );
}

{
  const lucky = compendium.characters.find((entry) => entry.id === "lucky");
  assert.equal(lucky?.cnName, "幸运星");
  assert.match(lucky?.unlock, /300 材料/);
  assert.equal(lucky?.unlockStatus, "已维护条件");
}

console.log("compendium tests passed");
