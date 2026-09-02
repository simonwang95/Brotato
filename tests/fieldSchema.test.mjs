import assert from "node:assert/strict";
import {
  COMBAT_CONTEXT_FIELD_SCHEMAS,
  ITEM_DELTA_FIELD_SCHEMAS,
  SCALING_FIELD_SCHEMAS,
  STAT_FIELD_SCHEMAS,
  WEAPON_FIELD_SCHEMAS,
  labelMap,
  toNumeric,
  validateNumberValue,
} from "../src/fieldSchema.js";
import { DEFAULT_ITEM_DELTA, DEFAULT_STATS, DEFAULT_WEAPON } from "../src/calculator.js";
import { DEFAULT_COMBAT_CONTEXT } from "../src/scenarioData.js";

// 1) 合法值：返回 ok + 数值。
{
  const r = validateNumberValue("12.5", STAT_FIELD_SCHEMAS.maxHp);
  assert.equal(r.ok, true, "合法整数应通过");
  assert.equal(r.value, 12.5, "应返回数值");
}

// 2) 空输入：明确报错，不静默。
{
  const r = validateNumberValue("", STAT_FIELD_SCHEMAS.maxHp);
  assert.equal(r.ok, false, "空输入应报错");
  assert.ok(r.error, "应有错误说明");
}

// 3) 非数字：报错。
{
  const r = validateNumberValue("abc", STAT_FIELD_SCHEMAS.maxHp);
  assert.equal(r.ok, false, "非数字应报错");
}

// 4) 超出上界：报错。
{
  const r = validateNumberValue("999", STAT_FIELD_SCHEMAS.critChance);
  assert.equal(r.ok, false, "暴击率 >100 应报错");
  assert.match(r.error, /100/);
}

// 5) 低于下界：报错（R2 后概率/属性下界放宽到 -100，覆盖官方合法负值）。
{
  const r = validateNumberValue("-101", STAT_FIELD_SCHEMAS.critChance);
  assert.equal(r.ok, false, "暴击率 <-100 应报错");
  assert.match(r.error, /-100/);
  // R2：官方目录中的合法负值应被手动输入接受（Crazy 闪避 -30、Druid 生命再生 -100 等）。
  assert.equal(validateNumberValue("-30", STAT_FIELD_SCHEMAS.dodge).ok, true, "闪避 -30 应通过");
  assert.equal(validateNumberValue("-100", STAT_FIELD_SCHEMAS.hpRegen).ok, true, "生命再生 -100 应通过");
  assert.equal(validateNumberValue("-100", STAT_FIELD_SCHEMAS.critChance).ok, true, "暴击率 -100 应通过");
  assert.equal(validateNumberValue("-100", STAT_FIELD_SCHEMAS.rangedDamage).ok, true, "远程伤害 -100 应通过");
  assert.equal(validateNumberValue("-10", STAT_FIELD_SCHEMAS.speed).ok, true, "移速 -10 应通过");
  assert.equal(validateNumberValue("-30", STAT_FIELD_SCHEMAS.luck).ok, true, "幸运 -30 应通过");
}

// 6) 边界值：min / max 本身应通过。
{
  assert.equal(validateNumberValue("-100", STAT_FIELD_SCHEMAS.critChance).ok, true, "暴击率下界 -100 应通过");
  assert.equal(validateNumberValue("100", STAT_FIELD_SCHEMAS.critChance).ok, true, "上界 100 应通过");
  // R1：冷却下界 0.03 秒覆盖游戏内最快的 2 帧武器（0.0333 秒）。
  assert.equal(validateNumberValue("0.03", WEAPON_FIELD_SCHEMAS.cooldown).ok, true, "冷却下界 0.03 应通过");
  assert.equal(validateNumberValue("0.0333", WEAPON_FIELD_SCHEMAS.cooldown).ok, true, "2 帧武器 0.0333s 应通过");
  assert.equal(validateNumberValue("10", WEAPON_FIELD_SCHEMAS.cooldown).ok, true, "冷却上界 10 应通过");
}

// 7) 整数字段：小数应报错。
{
  const r = validateNumberValue("2.5", WEAPON_FIELD_SCHEMAS.quantity);
  assert.equal(r.ok, false, "数量应为整数");
  assert.match(r.error, /整数/);
  assert.equal(validateNumberValue("3", WEAPON_FIELD_SCHEMAS.quantity).ok, true, "整数应通过");
}

// 8) 允许负数的字段（道具变化）：负值应通过。
{
  assert.equal(validateNumberValue("-10", ITEM_DELTA_FIELD_SCHEMAS.dodge).ok, true, "闪避变化可为负");
  assert.equal(validateNumberValue("-101", ITEM_DELTA_FIELD_SCHEMAS.dodge).ok, false, "超出下界应报错");
}

// 9) 概率/倍率字段：上界校验。
{
  assert.equal(validateNumberValue("0", WEAPON_FIELD_SCHEMAS.piercingDamageMultiplier).ok, true, "倍率下界 0");
  assert.equal(validateNumberValue("1", WEAPON_FIELD_SCHEMAS.piercingDamageMultiplier).ok, true, "倍率上界 1");
  assert.equal(validateNumberValue("1.5", WEAPON_FIELD_SCHEMAS.piercingDamageMultiplier).ok, false, "倍率 >1 报错");
  assert.equal(validateNumberValue("10", WEAPON_FIELD_SCHEMAS.critMultiplier).ok, true, "暴击倍率上界 10");
  assert.equal(validateNumberValue("11", WEAPON_FIELD_SCHEMAS.critMultiplier).ok, false, "暴击倍率 >10 报错");
  // 爆炸伤害是真实倍率（可 >1），与“保留”型倍率（≤1）区分。
  assert.equal(validateNumberValue("1.5", WEAPON_FIELD_SCHEMAS.explosionDamageMultiplier).ok, true, "爆炸倍率可 >1");
  assert.equal(validateNumberValue("10", WEAPON_FIELD_SCHEMAS.explosionDamageMultiplier).ok, true, "爆炸倍率上界 10");
  assert.equal(validateNumberValue("11", WEAPON_FIELD_SCHEMAS.explosionDamageMultiplier).ok, false, "爆炸倍率 >10 报错");
}

// 10) 战斗上下文：诅咒 / 结构物参数。
{
  assert.equal(validateNumberValue("0", COMBAT_CONTEXT_FIELD_SCHEMAS.curseIntensity).ok, true, "诅咒强度下界 0");
  assert.equal(validateNumberValue("100", COMBAT_CONTEXT_FIELD_SCHEMAS.curseIntensity).ok, true, "诅咒强度上界 100");
  assert.equal(validateNumberValue("101", COMBAT_CONTEXT_FIELD_SCHEMAS.curseIntensity).ok, false, "诅咒强度 >100 报错");
  assert.equal(validateNumberValue("0", COMBAT_CONTEXT_FIELD_SCHEMAS.structureUptime).ok, true, "结构物 uptime 下界 0");
  assert.equal(validateNumberValue("100", COMBAT_CONTEXT_FIELD_SCHEMAS.structureUptime).ok, true, "结构物 uptime 上界 100");
  assert.equal(validateNumberValue("101", COMBAT_CONTEXT_FIELD_SCHEMAS.structureUptime).ok, false, "结构物 uptime >100 报错");
  assert.equal(validateNumberValue("2.5", COMBAT_CONTEXT_FIELD_SCHEMAS.burnSpreadTargets).ok, false, "传播目标应为整数");
}

// 11) toNumeric：解析带单位/符号的字符串。
{
  assert.equal(toNumeric("12%"), 12, "百分号");
  assert.equal(toNumeric("+5"), 5, "正号");
  assert.equal(toNumeric("  3.5 "), 3.5, "空白");
  assert.equal(toNumeric("约 8 点"), 8, "中文前缀");
  assert.ok(Number.isNaN(toNumeric("无")), "无法解析应为 NaN");
}

// 12) 各 Schema 的 key 集合与 DEFAULT_* 常量一致（单一来源，防止漂移）。
{
  assert.deepEqual(
    Object.keys(STAT_FIELD_SCHEMAS).sort(),
    Object.keys(DEFAULT_STATS).sort(),
    "STAT_FIELD_SCHEMAS 与 DEFAULT_STATS 字段一致",
  );
  // 武器 Schema 覆盖 UI 暴露的数值字段；DEFAULT_WEAPON 还含 bossDamagePercent /
  // highHealthDamagePercent 等计算器内部字段（UI 暂不暴露），故用“子集”校验。
  const weaponNumericKeys = Object.keys(DEFAULT_WEAPON).filter((k) => k !== "name" && k !== "scaling");
  for (const key of Object.keys(WEAPON_FIELD_SCHEMAS)) {
    assert.ok(
      weaponNumericKeys.includes(key),
      `WEAPON_FIELD_SCHEMAS.${key} 应存在于 DEFAULT_WEAPON`,
    );
  }
  assert.deepEqual(
    Object.keys(SCALING_FIELD_SCHEMAS).sort(),
    Object.keys(DEFAULT_WEAPON.scaling).sort(),
    "SCALING_FIELD_SCHEMAS 与 DEFAULT_WEAPON.scaling 一致",
  );
  assert.deepEqual(
    Object.keys(ITEM_DELTA_FIELD_SCHEMAS).sort(),
    Object.keys(DEFAULT_ITEM_DELTA).sort(),
    "ITEM_DELTA_FIELD_SCHEMAS 与 DEFAULT_ITEM_DELTA 一致",
  );
  assert.deepEqual(
    Object.keys(COMBAT_CONTEXT_FIELD_SCHEMAS).sort(),
    Object.keys(DEFAULT_COMBAT_CONTEXT).sort(),
    "COMBAT_CONTEXT_FIELD_SCHEMAS 与 DEFAULT_COMBAT_CONTEXT 一致",
  );
}

// 13) Schema 默认值与 DEFAULT_* 常量一致。
{
  for (const key of Object.keys(DEFAULT_STATS)) {
    assert.equal(
      STAT_FIELD_SCHEMAS[key].default,
      DEFAULT_STATS[key],
      `stats.${key} 默认值一致`,
    );
  }
  for (const key of Object.keys(WEAPON_FIELD_SCHEMAS)) {
    assert.equal(
      WEAPON_FIELD_SCHEMAS[key].default,
      DEFAULT_WEAPON[key],
      `weapon.${key} 默认值一致`,
    );
  }
  for (const key of Object.keys(DEFAULT_WEAPON.scaling)) {
    assert.equal(
      SCALING_FIELD_SCHEMAS[key].default,
      DEFAULT_WEAPON.scaling[key],
      `scaling.${key} 默认值一致`,
    );
  }
  for (const key of Object.keys(DEFAULT_ITEM_DELTA)) {
    assert.equal(
      ITEM_DELTA_FIELD_SCHEMAS[key].default,
      DEFAULT_ITEM_DELTA[key],
      `itemDelta.${key} 默认值一致`,
    );
  }
  for (const key of Object.keys(DEFAULT_COMBAT_CONTEXT)) {
    assert.equal(
      COMBAT_CONTEXT_FIELD_SCHEMAS[key].default,
      DEFAULT_COMBAT_CONTEXT[key],
      `combatContext.${key} 默认值一致`,
    );
  }
}

// 14) labelMap 生成 key->label，且标签非空。
{
  const labels = labelMap(STAT_FIELD_SCHEMAS);
  assert.equal(labels.maxHp, "最大生命", "标签来自 schema");
  for (const value of Object.values(labels)) {
    assert.ok(value && value.length > 0, "标签非空");
  }
}

console.log("fieldSchema tests passed");