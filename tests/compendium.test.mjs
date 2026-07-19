import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildCompendium } from "../src/compendium.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));
const unlocks = JSON.parse(readFileSync("data/official-unlocks.json", "utf8"));
const compendium = buildCompendium(catalog, localization, unlocks);
const RAW_CATALOG_EFFECT_PATTERN =
  /\.gd\b|res:\/\/|\b(?:effect|item|stat|enemy|weapon)_[a-z0-9_]+\b|\[EMPTY\]|未解析|官方自定义收益|未知属性/i;

function assertNoRawEffectArtifacts(entry) {
  assert.ok(
    entry?.traits.every((line) => !/custom_arg\.gd|effect\.gd/.test(line)),
    `${entry?.id ?? "character"} traits should not expose raw effect script filenames`,
  );
}

function catalogEffectLines(entry) {
  return [...(entry.detailedAttributes ?? []), ...(entry.tierEffectLines ?? [])];
}

assert.equal(compendium.characters.length, 65, "character compendium should include official-only records and the maintained Giant gap");
assert.equal(compendium.weapons.length, 79, "weapon compendium should group all official weapons");
assert.equal(compendium.items.length, 244, "item compendium should group all official items");
assert.ok(
  compendium.characters
    .filter((entry) => entry.officialFound)
    .every((entry) => entry.cnName !== "待本地化"),
  "every official character compendium entry should use static Chinese localization",
);

{
  const entries = [...compendium.weapons, ...compendium.items];
  const effectLines = entries.flatMap(catalogEffectLines);
  const rawEffectLines = effectLines.filter((line) => RAW_CATALOG_EFFECT_PATTERN.test(line));
  const blankEffectLines = effectLines.filter((line) => /^T\d+\s*$/.test(line));

  assert.equal(entries.length, 323, "effect audit should cover all 79 weapons and 244 items");
  assert.ok(effectLines.length > 1_500, "effect audit should cover the complete rendered line set");
  assert.deepEqual(rawEffectLines, [], "catalog effects should never expose internal resource keys");
  assert.deepEqual(blankEffectLines, [], "catalog effects should never render empty tier rows");
}

{
  const harpoon = compendium.weapons.find((entry) => entry.nameKey === "WEAPON_HARPOON_GUN");
  assert.ok(
    harpoon?.tierEffectLines.includes(
      "T2 命中时生成减速区域；减速幅度和持续时间待解码",
    ),
    "Harpoon Gun should explain its slow-zone mechanic without exposing effect_slow_in_zone",
  );

  const stick = compendium.weapons.find((entry) => entry.nameKey === "WEAPON_STICK");
  assert.ok(
    stick?.tierEffectLines.includes("T1 每额外持有 1 件同名武器：该武器基础伤害 +4"),
    "Stick should explain same-weapon stacking",
  );

  const grenadeLauncher = compendium.weapons.find(
    (entry) => entry.nameKey === "WEAPON_GRENADE_LAUNCHER",
  );
  assert.ok(
    grenadeLauncher?.tierEffectLines.includes("T2 命中时有 100% 概率爆炸"),
    "explosive weapons should expose their parsed trigger chance",
  );

  const vorpalSword = compendium.weapons.find(
    (entry) => entry.nameKey === "WEAPON_VORPAL_SWORD",
  );
  assert.ok(
    vorpalSword?.tierEffectLines.includes("T2 命中时有 1% 概率直接秒杀目标"),
    "Vorpal Sword should preserve the official percentage unit",
  );
}

{
  const axolotl = compendium.items.find((entry) => entry.nameKey === "ITEM_AXOLOTL");
  assert.ok(
    axolotl?.detailedAttributes.includes("T4 获得时：交换最高与最低的正面主属性"),
    "Axolotl should expose the official stat-swap mechanic",
  );

  const goldfish = compendium.items.find((entry) => entry.nameKey === "ITEM_GOLDFISH");
  assert.ok(
    goldfish?.detailedAttributes.includes("T3 下次刷新后：该道具阶级 +1"),
    "Goldfish should explain its next-reroll tier increase",
  );

  const mirror = compendium.items.find((entry) => entry.nameKey === "ITEM_MIRROR");
  assert.ok(
    mirror?.detailedAttributes.includes(
      "T3 复制下一个从商店获得的道具（不能超过道具持有上限）",
    ),
    "Mirror should expose the official duplication rule",
  );

  const jellyshield = compendium.items.find((entry) => entry.nameKey === "ITEM_JELLYSHIELD");
  assert.deepEqual(jellyshield?.detailedAttributes, [
    "T3 生成水母盾宠物：环绕玩家移动并阻挡敌方投射物。",
  ]);

  const spyglass = compendium.items.find((entry) => entry.nameKey === "ITEM_SPYGLASS");
  assert.ok(
    spyglass?.detailedAttributes.includes("T2 商店刷新价格 -25%"),
    "Spyglass should localize its reroll-price reduction",
  );
}

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
    cyberball?.detailedAttributes.includes(
      "T2 击杀敌人时：25% 概率，造成相当于幸运 25% 的伤害",
    ),
    "Cyberball should expose parsed trigger chance and luck scaling",
  );
}

{
  const recyclingMachine = compendium.items.find(
    (entry) => entry.nameKey === "ITEM_RECYCLING_MACHINE",
  );
  assert.ok(
    recyclingMachine?.detailedAttributes.includes("T2 回收道具时额外材料 +35"),
    "recycling machine should expose the localized per-recycle material effect",
  );

  const pearl = compendium.items.find((entry) => entry.nameKey === "ITEM_PEARL");
  assert.ok(
    pearl?.detailedAttributes.includes("T2 每个箱子：3% 概率额外获得珍珠"),
    "pearl should expose its specific per-crate chance",
  );

  const treasureMap = compendium.items.find((entry) => entry.nameKey === "ITEM_TREASURE_MAP");
  assert.ok(
    treasureMap?.detailedAttributes.includes("T2 每个箱子：20% 概率额外获得随机道具"),
    "treasure map should expose its random-item crate chance",
  );

  const whistle = compendium.items.find((entry) => entry.nameKey === "ITEM_WHISTLE");
  assert.ok(
    whistle?.detailedAttributes.includes("T1 战利品外星人出现概率 +50%"),
    "whistle should expose the localized loot-alien chance",
  );
  assert.ok(
    whistle?.detailedAttributes.includes("T1 战利品外星人移速 +20%"),
    "whistle should expose the chase-speed downside separately",
  );
}

{
  const blackFlag = compendium.items.find((entry) => entry.nameKey === "ITEM_BLACK_FLAG");
  assert.ok(
    blackFlag?.detailedAttributes.includes("T3 诅咒敌人击杀材料 +1"),
    "Black Flag should expose localized curse-kill material attributes",
  );
  assert.ok(
    blackFlag?.detailedAttributes.includes("T3 敌人数量 +10"),
    "Black Flag should expose localized enemy-count risk attributes",
  );
}

{
  const snake = compendium.items.find((entry) => entry.nameKey === "ITEM_SNAKE");
  assert.ok(
    snake?.detailedAttributes.includes("T1 燃烧传播 +1"),
    "Snake should expose localized burning spread attributes",
  );
  const turret = compendium.items.find((entry) => entry.nameKey === "ITEM_TURRET");
  assert.ok(
    turret?.detailedAttributes.includes("T1 炮塔"),
    "Turret should expose localized structure attributes",
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
  const expectedGrowth = new Map([
    ["WEAPON_GHOST_AXE", "T1 每用该武器击杀 20 个敌人：总伤害 +1"],
    ["WEAPON_GHOST_FLINT", "T1 每用该武器击杀 20 个敌人：攻速 +1"],
    ["WEAPON_GHOST_SCEPTER", "T1 每用该武器击杀 20 个敌人：最大生命 +1"],
  ]);
  expectedGrowth.forEach((line, nameKey) => {
    const weapon = compendium.weapons.find((entry) => entry.nameKey === nameKey);
    assert.ok(
      weapon?.detailedAttributes.includes(line),
      `${nameKey} should expose the exact official kill-growth stat and threshold`,
    );
    assert.ok(
      weapon?.detailedAttributes.some((attribute) =>
        attribute.includes("T4 每用该武器击杀 12 个敌人"),
      ),
      `${nameKey} should expose the official tier-four kill threshold`,
    );
  });
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
    lucky?.traits.includes("拾取材料时：75% 概率，造成相当于幸运 15% 的伤害"),
    "Lucky should show pickup damage trigger",
  );
}

{
  const baby = compendium.characters.find((entry) => entry.id === "baby");
  assert.equal(baby?.nameKey, "CHARACTER_BABY");
  assert.equal(baby?.cnName, "宝宝");
  assert.equal(baby?.archetype, "升级经济");
  assert.equal(baby?.unlockStatus, "已维护条件");
  assert.equal(baby?.unlockEvidenceStatus, "verified-static-text");
  assert.match(baby?.unlock ?? "", /第 6 波前达到 10 等级/);
  assert.equal(baby?.imageAssetPath, "data/assets/characters/character_baby.webp");
  assert.ok(
    baby?.traits.some((line) => line.includes("收获 +12")),
    "maintained characters should expose parsed official traits",
  );
}

{
  const wounded = compendium.characters.find((entry) => entry.id === "wounded");
  assert.equal(wounded?.officialOnly, true);
  assert.equal(wounded?.cnName, "伤者");
  assert.equal(wounded?.unlockStatus, "已抽取静态条件");
  assert.equal(wounded?.unlockEvidenceStatus, "verified-static-text");
  assert.ok(wounded?.traits.includes("受到一次伤害即死亡"));
  assert.ok(wounded?.traits.includes("起始物品：水熊虫 +1"));
  assert.ok(wounded?.traits.includes("受伤者道具机制"));
  assertNoRawEffectArtifacts(wounded);
  assert.ok(
    wounded?.unlockEvidenceLines.some((line) => line.includes("在噩梦难度下赢得一局游戏")),
    "official-only characters should expose verified static challenge text",
  );
}

{
  const beastMaster = compendium.characters.find((entry) => entry.id === "beastMaster");
  assert.equal(beastMaster?.cnName, "驯兽师");
  assert.equal(beastMaster?.unlockStatus, "已抽取静态条件");
  assert.ok(
    beastMaster?.unlockEvidenceLines.some((line) => line.includes("解锁猫特林机枪")),
    "beast master should expose verified static challenge text",
  );
  assert.ok(beastMaster?.traits.includes("不能持有武器"));
  assert.ok(beastMaster?.traits.includes("每 1 点永久宠物：移速 +2%"));
  assert.ok(beastMaster?.traits.includes("驯兽师宠物机制"));
  assert.ok(beastMaster?.traits.includes("提高宠物标签出现率 +1"));
  assertNoRawEffectArtifacts(beastMaster);
}

{
  const knight = compendium.characters.find((entry) => entry.id === "knight");
  assert.ok(knight?.traits.includes("每 1 点护甲：近战伤害 +2"));
  assert.ok(knight?.traits.includes("不能持有远程武器"));
  assert.ok(knight?.traits.includes("最低武器阶级：T2"));
  assertNoRawEffectArtifacts(knight);
}

{
  const technomage = compendium.characters.find((entry) => entry.id === "technomage");
  assert.ok(technomage?.traits.includes("起始物品：炮塔 +2"));
  assert.ok(technomage?.traits.includes("每 1 点永久元素伤害：结构物攻速 +5"));
  assert.ok(technomage?.traits.includes("每 1 点结构物：元素伤害 +2"));
  assertNoRawEffectArtifacts(technomage);
}

{
  const vampire = compendium.characters.find((entry) => entry.id === "vampire");
  assert.ok(vampire?.traits.includes("每 1 点永久已损失生命百分比：总伤害 +2%"));
  assert.ok(vampire?.traits.includes("每 3 点已损失生命百分比：生命窃取 +1%"));
  assert.ok(vampire?.traits.includes("每 5 点永久已损失生命百分比：护甲 +1"));
  assert.ok(vampire?.traits.includes("消耗品治疗 -100"));
  assertNoRawEffectArtifacts(vampire);
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
  assert.equal(chef?.unlockStatus, "已维护条件");
  assert.equal(chef?.unlockEvidenceStatus, "verified-static-text");
  assert.ok(
    chef?.unlockEvidenceLines.some((line) => line.includes("同时让至少25个敌人处于燃烧状态")),
    "verified DLC unlocks should expose the static simplified-Chinese condition",
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
