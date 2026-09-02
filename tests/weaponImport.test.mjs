import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { framesToSeconds, FRAMES_PER_SECOND } from "../src/calculator.js";
import { weaponRecordToSimulator } from "../src/weaponImport.js";
import { calculateWeaponDamage, normalizeWeapon } from "../src/calculator.js";
import { DEFAULT_STATS } from "../src/calculator.js";

const catalog = JSON.parse(readFileSync(new URL("../data/official-catalog.json", import.meta.url), "utf8"));
const weapons = catalog.records.filter((r) => r.kind === "weapon");
// 与 app.js 的 findCatalogWeaponRecord 一致：取最低阶级作为代表（同一 nameKey 可能有多个阶级）。
const byKey = {};
for (const w of weapons) {
  if (!byKey[w.nameKey] || (w.tier ?? 0) < (byKey[w.nameKey].tier ?? 0)) byKey[w.nameKey] = w;
}

// R1：framesToSeconds 是帧→秒的唯一换算（60 帧 = 1 秒）。
{
  assert.equal(FRAMES_PER_SECOND, 60);
  assert.equal(framesToSeconds(4), 4 / 60, "4 帧 = 0.0667 秒");
  assert.equal(framesToSeconds(45), 45 / 60, "45 帧 = 0.75 秒");
  assert.equal(framesToSeconds(2), 2 / 60, "2 帧 = 0.0333 秒");
  assert.equal(framesToSeconds(300), 5, "300 帧 = 5 秒");
  assert.equal(framesToSeconds(undefined), 0, "缺省返回 0");
}

// R1：SMG（4 帧）与 Spear（45 帧）的冷却换算。
// 旧实现 /10 会把 SMG 变成 0.40s、Spear 变成 4.50s（6 倍失真）。
{
  const smg = weaponRecordToSimulator(byKey.WEAPON_SMG);
  assert.ok(Math.abs(smg.cooldown - 4 / 60) < 0.005, `SMG 冷却应≈0.067s，实际 ${smg.cooldown}`);
  assert.ok(smg.cooldown < 0.1, "SMG 冷却不应被 /10 放大到 0.4s");

  const spear = weaponRecordToSimulator(byKey.WEAPON_SPEAR);
  assert.ok(Math.abs(spear.cooldown - 45 / 60) < 0.005, `Spear 冷却应=0.75s，实际 ${spear.cooldown}`);
  assert.ok(Math.abs(spear.cooldown - 0.75) < 0.005, "Spear 冷却应=0.75s");
}

// R1：仅高阶存在的武器（Chain Gun，2 帧）——验证 2 帧边界不被静默夹取。
{
  const chainGun = weaponRecordToSimulator(byKey.WEAPON_CHAIN_GUN);
  assert.ok(byKey.WEAPON_CHAIN_GUN.tier >= 2, "Chain Gun 应为高阶武器");
  // 2 帧 = 0.0333s，低于旧下限 0.05；新下限 0.03 应原样保留（不被夹取）。
  assert.ok(Math.abs(chainGun.cooldown - 2 / 60) < 0.005, `Chain Gun 冷却应≈0.0333s，实际 ${chainGun.cooldown}`);
  const normalized = normalizeWeapon(chainGun);
  assert.ok(Math.abs(normalized.cooldown - 2 / 60) < 0.005, "计算层不应把 2 帧武器夹取到 0.05s");
}

// R1 验收：图鉴显示、带入输入框、计算器实际使用的冷却三者一致。
// 图鉴显示 frames/60 秒（compendium.js formatCooldown），带入用 framesToSeconds，
// 计算器用 normalizeWeapon 后的值——三者都应等于 frames/60。
for (const key of ["WEAPON_SMG", "WEAPON_SPEAR", "WEAPON_CHAIN_GUN", "WEAPON_BLUNDERBUSS"]) {
  const record = byKey[key];
  const frames = record.stats.cooldown;
  const expected = frames / 60;
  const imported = weaponRecordToSimulator(record);
  const calculator = normalizeWeapon(imported);
  assert.ok(Math.abs(imported.cooldown - expected) < 0.005, `${key} 带入冷却应=frames/60`);
  assert.ok(Math.abs(calculator.cooldown - expected) < 0.005, `${key} 计算器冷却应=frames/60`);
  // 图鉴显示口径（frames/60 秒）与带入一致。
  assert.ok(Math.abs(frames / 60 - imported.cooldown) < 0.005, `${key} 图鉴与带入一致`);
}

// R1：带入后 DPS 不失真（SMG 高攻速武器 DPS 应显著高于 Spear）。
{
  const smg = weaponRecordToSimulator(byKey.WEAPON_SMG);
  const spear = weaponRecordToSimulator(byKey.WEAPON_SPEAR);
  const smgDps = calculateWeaponDamage(DEFAULT_STATS, smg).dps;
  const spearDps = calculateWeaponDamage(DEFAULT_STATS, spear).dps;
  assert.ok(smgDps > 0 && spearDps > 0, "DPS 应为正");
  // SMG 4 帧 vs Spear 45 帧，攻速差 11 倍，DPS 应反映这一差异（不被 /10 抹平）。
  assert.ok(smgDps > spearDps, `SMG DPS(${smgDps.toFixed(1)}) 应 > Spear DPS(${spearDps.toFixed(1)})`);
}

console.log("weaponImport (R1 冷却单位) tests passed");