import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCompendium } from "../src/compendium.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));
const unlocks = JSON.parse(readFileSync("data/official-unlocks.json", "utf8"));
const compendium = buildCompendium(catalog, localization, unlocks);

assert.equal(compendium.characters.length, 65, "character compendium should include official-only records and the maintained Giant gap");
assert.equal(compendium.weapons.length, 79, "weapon compendium should group all official weapons");
assert.equal(compendium.items.length, 244, "item compendium should group all official items");

{
  const lute = compendium.weapons.find((entry) => entry.nameKey === "WEAPON_LUTE");
  assert.equal(lute?.enName, "Lute");
  assert.equal(lute?.cnName, "琉特琴");
  assert.equal(lute?.sourceLabel, "深海魔怪");
  assert.equal(lute?.tierLabel, "T1-T4");
  assert.equal(lute?.valueLabel, "15-122");
  assert.equal(lute?.imageAssetPath, "data/assets/weapons/weapon_lute_1.webp");
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
  assert.deepEqual(
    lute?.weaponTierRows.map(({ tier, damage, cooldown, scaling }) => ({
      tier,
      damage,
      cooldown,
      scaling,
    })),
    [
      { tier: "T1", damage: "4", cooldown: "45帧 (0.75秒)", scaling: "50% 近战伤害，10% 幸运" },
      { tier: "T2", damage: "8", cooldown: "40帧 (0.67秒)", scaling: "50% 近战伤害，15% 幸运" },
      { tier: "T3", damage: "12", cooldown: "35帧 (0.58秒)", scaling: "50% 近战伤害，20% 幸运" },
      { tier: "T4", damage: "16", cooldown: "30帧 (0.50秒)", scaling: "50% 近战伤害，25% 幸运" },
    ],
    "Lute should expose structured rows for the tier table",
  );
  assert.equal(lute?.tierEffectLines.length, 4, "Lute should keep per-tier effects separate");
}

{
  const cyberball = compendium.items.find((entry) => entry.nameKey === "ITEM_CYBERBALL");
  assert.equal(cyberball?.cnName, "赛博球");
  assert.equal(cyberball?.valueLabel, "30");
  assert.equal(cyberball?.unlockLabel, "默认解锁");
  assert.equal(cyberball?.imageAssetPath, "data/assets/items/item_cyberball.webp");
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
  assert.ok(
    lucky?.unlockEvidenceLines.some((line) => line.includes("搜集300材料")),
    "Lucky should expose verified static unlock evidence",
  );
  assert.equal(lucky?.imageAssetPath, "data/assets/characters/character_lucky.webp");
  assert.ok(lucky?.traits.includes("幸运 +100"), "Lucky should show base luck trait");
  assert.ok(lucky?.traits.includes("幸运 获取 +25%"), "Lucky should show luck gain trait");
  assert.ok(
    lucky?.traits.includes("拾取材料时：75% 概率，造成 15% 幸运 的伤害"),
    "Lucky should show pickup damage trigger",
  );
}

{
  const baby = compendium.characters.find((entry) => entry.id === "baby");
  assert.equal(baby?.officialOnly, true);
  assert.equal(baby?.nameKey, "CHARACTER_BABY");
  assert.equal(baby?.unlockStatus, "已抽取静态条件");
  assert.match(baby?.unlock ?? "", /第6波前达到10等级/);
  assert.equal(baby?.imageAssetPath, "data/assets/characters/character_baby.webp");
  assert.ok(
    baby?.traits.some((line) => line.includes("收获 +12")),
    "official-only characters should expose parsed official traits",
  );
}

{
  const wounded = compendium.characters.find((entry) => entry.id === "wounded");
  assert.equal(wounded?.officialOnly, true);
  assert.equal(wounded?.unlockEvidenceStatus, "pending-text");
  assert.ok(
    wounded?.unlockEvidenceLines.some((line) => line.includes("CHAL_DIFFICULTY_NIGHTMARE_1_DESC")),
    "official-only pending characters should keep static challenge evidence",
  );
}

{
  const oneArmed = compendium.characters.find((entry) => entry.id === "oneArmed");
  assert.ok(
    oneArmed?.unlockEvidenceLines.some((line) => line.includes("CHAL_DIFFICULTY_DESC")),
    "oneArmed should use the oneArm official unlock alias for static evidence",
  );
}

{
  const giant = compendium.characters.find((entry) => entry.id === "giant");
  assert.equal(giant?.officialFound, false);
  assert.equal(giant?.sourceLabel, "未匹配官方角色资源");
  assert.match(giant?.unlock ?? "", /官方角色资源未包含 CHARACTER_GIANT/);
}

{
  const chef = compendium.characters.find((entry) => entry.id === "chef");
  assert.equal(chef?.unlockStatus, "待补精确条件");
  assert.equal(chef?.unlockEvidenceStatus, "pending-text");
  assert.ok(
    chef?.unlockEvidenceLines.some((line) => line.includes("CHAL_BARBECUE_DESC")),
    "pending DLC unlocks should expose static challenge keys",
  );
  assert.ok(
    chef?.unlockEvidenceLines.some((line) => line.includes("PHashTranslation")),
    "pending DLC unlocks should explain why the text is not promoted",
  );
}

{
  const brawler = compendium.characters.find((entry) => entry.id === "brawler");
  assert.ok(brawler?.traits.includes("徒手套装：攻速 +50%"));
  assert.ok(brawler?.traits.includes("闪避 +15%"));
  assert.ok(brawler?.traits.includes("范围 -50"));
}

{
  const wellRounded = compendium.characters.find((entry) => entry.id === "wellRounded");
  assert.deepEqual(wellRounded?.traits, ["最大生命 +5", "移速 +5%", "收获 +8"]);
}

console.log("compendium tests passed");
