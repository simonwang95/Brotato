import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { validateNumberValue, STAT_FIELD_SCHEMAS } from "../src/fieldSchema.js";
import { calculateWeaponDamage, normalizeStats, DEFAULT_STATS, DEFAULT_WEAPON } from "../src/calculator.js";
import { calculateScenarioDps, calculateSurvivalModel } from "../src/scenarioCalculator.js";

const catalog = JSON.parse(readFileSync(new URL("../data/official-catalog.json", import.meta.url), "utf8"));

// 从角色 effects[] 中收集官方负属性（key = stat_xxx, value 可为负）。
function collectOfficialNegativeStats() {
  const negatives = {};
  for (const rec of catalog.records) {
    if (rec.kind !== "character") continue;
    for (const eff of rec.effects ?? []) {
      const m = /^stat_(.+)$/.exec(eff.key ?? "");
      if (!m) continue;
      const statKey = m[1];
      if (eff.value < 0) {
        negatives[statKey] = Math.min(negatives[statKey] ?? 0, eff.value);
      }
    }
  }
  return negatives;
}

const officialNegatives = collectOfficialNegativeStats();

// R2 验收 1：官方目录中的合法负属性可被面板手动输入接受（validateNumberValue 不拒绝）。
{
  const checked = [];
  for (const [statKey, value] of Object.entries(officialNegatives)) {
    if (!STAT_FIELD_SCHEMAS[statKey]) continue; // 只校验面板暴露的字段
    const r = validateNumberValue(String(value), STAT_FIELD_SCHEMAS[statKey]);
    assert.equal(r.ok, true, `官方负属性 ${statKey}=${value} 应被手动输入接受`);
    checked.push(`${statKey}=${value}`);
  }
  // 至少应覆盖若干官方负属性（闪避、生命再生、远程伤害、攻速、幸运等）。
  assert.ok(checked.length >= 5, `应覆盖至少 5 个官方负属性，实际 ${checked.length}: ${checked.join(", ")}`);
  // 明确抽查 review 中列举的典型负值。
  for (const [statKey, value] of [["dodge", -30], ["hpRegen", -100], ["rangedDamage", -100], ["attackSpeed", -100], ["luck", -30]]) {
    assert.equal(validateNumberValue(String(value), STAT_FIELD_SCHEMAS[statKey]).ok, true, `${statKey}=${value} 应通过`);
  }
}

// R2 验收 2：计算层继续应用明确语义夹取（面板可输入负值 ≠ 最终概率/倍率为负）。
{
  // 最终闪避仍在 [0, 60%]。
  const negativeDodge = { ...DEFAULT_STATS, dodge: -30 };
  const survival = calculateSurvivalModel(negativeDodge);
  assert.ok(survival.dodgeChance >= 0 && survival.dodgeChance <= 0.6, `最终闪避应在 [0,60%]，实际 ${(survival.dodgeChance * 100).toFixed(1)}%`);
  assert.equal(survival.dodgeChance, 0, "负闪避应夹取到 0");

  // 最终暴击仍在 [0, 100%]。
  const negativeCrit = { ...DEFAULT_STATS, critChance: -100 };
  const dmg = calculateWeaponDamage(negativeCrit, DEFAULT_WEAPON);
  assert.ok(dmg.totalCritChance >= 0 && dmg.totalCritChance <= 1, `最终暴击应在 [0,100%]，实际 ${(dmg.totalCritChance * 100).toFixed(1)}%`);

  // 负伤害按现有规则处理（伤害下限 1，不为负/不为 0）。
  const negativeDamage = { ...DEFAULT_STATS, meleeDamage: -100, rangedDamage: -100, damagePercent: -100 };
  const dmg2 = calculateWeaponDamage(negativeDamage, DEFAULT_WEAPON);
  assert.ok(dmg2.nonCritDamage >= 1, `非暴击伤害应 >=1，实际 ${dmg2.nonCritDamage}`);
  assert.ok(dmg2.critDamage >= 1, `暴击伤害应 >=1，实际 ${dmg2.critDamage}`);
  assert.ok(dmg2.dps >= 0, `DPS 应 >=0，实际 ${dmg2.dps}`);

  // 负攻速：speedMultiplier 下限 0.1（不为 0/负）。
  const negativeSpeed = { ...DEFAULT_STATS, attackSpeed: -100 };
  const dmg3 = calculateWeaponDamage(negativeSpeed, DEFAULT_WEAPON);
  assert.ok(dmg3.speedMultiplier >= 0.1, `攻速倍率应 >=0.1，实际 ${dmg3.speedMultiplier}`);

  // 负移速：speedAvoidance 下限 0（不为负）。
  const negativeMoveSpeed = { ...DEFAULT_STATS, speed: -10 };
  const survival2 = calculateSurvivalModel(negativeMoveSpeed);
  assert.ok(survival2.speedAvoidance >= 0, `移速闪避应 >=0，实际 ${survival2.speedAvoidance}`);
}

// R2 验收 3：完整场景计算（calculateScenarioDps）对负属性保持有限且非负。
{
  const negativeStats = { ...DEFAULT_STATS, dodge: -30, critChance: -50, rangedDamage: -100, attackSpeed: -100, luck: -30 };
  const result = calculateScenarioDps(negativeStats, DEFAULT_WEAPON, "normalWave");
  assert.ok(Number.isFinite(result.totalDps), `总 DPS 应有限，实际 ${result.totalDps}`);
  assert.ok(result.totalDps >= 0, `总 DPS 应 >=0，实际 ${result.totalDps}`);
  assert.ok(Number.isFinite(result.survival.dodgeChance), "闪避率应有限");
  assert.ok(result.survival.dodgeChance >= 0 && result.survival.dodgeChance <= 0.6, "最终闪避应在 [0,60%]");
  // 负属性不应让结果变成 NaN/Infinity。
  for (const [k, v] of Object.entries(result)) {
    if (typeof v === "number") assert.ok(Number.isFinite(v), `${k} 应有限，实际 ${v}`);
  }
}

// R2：normalizeStats 不夹取（保留原始负值），夹取发生在各模型层。
{
  const raw = normalizeStats({ ...DEFAULT_STATS, dodge: -30, luck: -30 });
  assert.equal(raw.dodge, -30, "normalizeStats 应保留原始负值（不夹取）");
  assert.equal(raw.luck, -30, "normalizeStats 应保留原始负值（不夹取）");
}

console.log("negativeStats (R2 负属性) tests passed");