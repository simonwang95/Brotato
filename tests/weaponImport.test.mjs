import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { framesToSeconds, FRAMES_PER_SECOND } from "../src/calculator.js";
import { weaponRecordToSimulator } from "../src/weaponImport.js";
import { calculateWeaponDamage, normalizeWeapon } from "../src/calculator.js";
import { DEFAULT_STATS } from "../src/calculator.js";
import { calculatorWeaponFromRecord } from "../src/strategyGenerator.js";

const catalog = JSON.parse(readFileSync(new URL("../data/official-catalog.json", import.meta.url), "utf8"));
const weapons = catalog.records.filter((r) => r.kind === "weapon");
// 与 app.js 的 findCatalogWeaponRecord 一致：取最低阶级作为代表（同一 nameKey 可能有多个阶级）。
const byKey = {};
for (const w of weapons) {
  if (!byKey[w.nameKey] || (w.tier ?? 0) < (byKey[w.nameKey].tier ?? 0)) byKey[w.nameKey] = w;
}

const r2 = (x) => Math.round(x * 100) / 100;

// R1：framesToSeconds 是帧→秒的唯一换算（60 帧 = 1 秒）。
{
  assert.equal(FRAMES_PER_SECOND, 60);
  assert.equal(framesToSeconds(4), 4 / 60, "4 帧 = 0.0667 秒");
  assert.equal(framesToSeconds(45), 45 / 60, "45 帧 = 0.75 秒");
  assert.equal(framesToSeconds(2), 2 / 60, "2 帧 = 0.0333 秒");
  assert.equal(framesToSeconds(300), 5, "300 帧 = 5 秒");
  assert.equal(framesToSeconds(undefined), 0, "缺省返回 0");
}

// R1 + F5：SMG（4 帧）与 Spear（45 帧）的冷却换算——完整帧精度，严格相等（不再用 0.005 容差掩盖舍入）。
// 旧实现 /10 会把 SMG 变成 0.40s、Spear 变成 4.50s（6 倍失真）；
// 中间版本 r2(frames/60) 会把 2 帧武器 0.0333… 舍入成 0.03（+11% DPS 失真）。
{
  const smg = weaponRecordToSimulator(byKey.WEAPON_SMG);
  assert.equal(smg.cooldown, framesToSeconds(4), `SMG 冷却应严格 = 4/60，实际 ${smg.cooldown}`);
  assert.ok(smg.cooldown < 0.1, "SMG 冷却不应被 /10 放大到 0.4s");

  const spear = weaponRecordToSimulator(byKey.WEAPON_SPEAR);
  assert.equal(spear.cooldown, framesToSeconds(45), `Spear 冷却应严格 = 45/60，实际 ${spear.cooldown}`);
}

// R1 + F5：仅高阶存在的武器（Chain Gun，2 帧）——2 帧边界不被静默夹取，且保留完整精度。
{
  const chainGun = weaponRecordToSimulator(byKey.WEAPON_CHAIN_GUN);
  assert.ok(byKey.WEAPON_CHAIN_GUN.tier >= 2, "Chain Gun 应为高阶武器");
  // 2 帧 = 0.0333…s，低于旧下限 0.05；新下限 0.03 应原样保留（不被夹取）。
  assert.equal(chainGun.cooldown, framesToSeconds(2), `Chain Gun 冷却应严格 = 2/60，实际 ${chainGun.cooldown}`);
  const normalized = normalizeWeapon(chainGun);
  assert.equal(normalized.cooldown, framesToSeconds(2), "计算层不应把 2 帧武器夹取或舍入");
}

// R1 验收 + F5：图鉴显示、带入输入框、计算器实际使用的冷却三者严格一致（frames/60 原值）。
for (const key of ["WEAPON_SMG", "WEAPON_SPEAR", "WEAPON_CHAIN_GUN", "WEAPON_BLUNDERBUSS"]) {
  const record = byKey[key];
  const frames = record.stats.cooldown;
  const expected = framesToSeconds(frames);
  const imported = weaponRecordToSimulator(record);
  const calculator = normalizeWeapon(imported);
  assert.equal(imported.cooldown, expected, `${key} 带入冷却应严格 = frames/60`);
  assert.equal(calculator.cooldown, expected, `${key} 计算器冷却应严格 = frames/60`);
  // 图鉴显示口径（frames/60 秒）与带入一致。
  assert.equal(frames / 60, imported.cooldown, `${key} 图鉴与带入一致`);
}

// F5：两条消费路径（模拟器带入 vs 攻略计算模型）的冷却必须严格相等。
// weaponRecordToSimulator 与 calculatorWeaponFromRecord 都应使用 framesToSeconds 原值；
// 任一路径偷偷引入 2 位小数舍入都会在这里暴露。
{
  let checked = 0;
  for (const record of weapons) {
    const imported = weaponRecordToSimulator(record);
    const model = calculatorWeaponFromRecord(record);
    if (!model) continue;
    assert.equal(
      imported.cooldown,
      model.cooldown,
      `${record.nameKey}(tier ${record.tier}) 两条路径冷却不一致：带入 ${imported.cooldown} vs 模型 ${model.cooldown}`,
    );
    checked += 1;
  }
  assert.ok(checked > 0, "应检查到双路径武器");
  console.log(`[F5] 双路径冷却严格一致：${checked} 个武器记录`);
}

// F5：直接 DPS 对比 + 突变敏感性。
// (1) 两条路径的 DPS 应严格相等（当前目录数据下两路径数值无差异）；
// (2) 若把 2 帧武器冷却舍入到 2 位小数（0.0333… → 0.03），DPS 偏差必须 > 5%——
//     证明本测试能抓住旧 r2 舍入 bug（+11.1% 失真），而不是被容差掩盖。
{
  const smg = weaponRecordToSimulator(byKey.WEAPON_SMG);
  const spear = weaponRecordToSimulator(byKey.WEAPON_SPEAR);
  const smgDps = calculateWeaponDamage(DEFAULT_STATS, smg).dps;
  const spearDps = calculateWeaponDamage(DEFAULT_STATS, spear).dps;
  assert.ok(smgDps > 0 && spearDps > 0, "DPS 应为正");
  // SMG 4 帧 vs Spear 45 帧，攻速差 11 倍，DPS 应反映这一差异（不被 /10 抹平）。
  assert.ok(smgDps > spearDps, `SMG DPS(${smgDps.toFixed(1)}) 应 > Spear DPS(${spearDps.toFixed(1)})`);

  // (1) 双路径 DPS 严格相等（4 个代表武器）。
  for (const key of ["WEAPON_SMG", "WEAPON_SPEAR", "WEAPON_CHAIN_GUN", "WEAPON_BLUNDERBUSS"]) {
    const record = byKey[key];
    const importedDps = calculateWeaponDamage(DEFAULT_STATS, weaponRecordToSimulator(record)).dps;
    const modelDps = calculateWeaponDamage(DEFAULT_STATS, calculatorWeaponFromRecord(record)).dps;
    assert.equal(importedDps, modelDps, `${key} 双路径 DPS 应严格相等：${importedDps} vs ${modelDps}`);
  }

  // (2) 突变敏感性：2 帧武器（Chain Gun）完整精度 vs 2 位小数舍入。
  const chainGun = weaponRecordToSimulator(byKey.WEAPON_CHAIN_GUN);
  const fullDps = calculateWeaponDamage(DEFAULT_STATS, chainGun).dps;
  const roundedWeapon = { ...chainGun, cooldown: r2(chainGun.cooldown) };
  assert.notEqual(roundedWeapon.cooldown, chainGun.cooldown, "2 帧武器 2 位小数舍入后应与原值不同（否则本检查无意义）");
  const roundedDps = calculateWeaponDamage(DEFAULT_STATS, roundedWeapon).dps;
  const deviation = Math.abs(roundedDps - fullDps) / fullDps;
  assert.ok(
    deviation > 0.05,
    `2 帧武器冷却舍入到 2 位小数应造成 >5% DPS 偏差（实际 ${(deviation * 100).toFixed(1)}%），测试应能抓住旧 r2 bug`,
  );
  console.log(`[F5] 突变敏感性：2 帧武器舍入偏差 ${(deviation * 100).toFixed(1)}%（>5%，旧 bug 可被捕获）`);
}

console.log("weaponImport (R1 冷却单位 + F5 完整帧精度) tests passed");