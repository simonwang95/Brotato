import { DEFAULT_WEAPON, framesToSeconds } from "./calculator.js";

// 把官方目录武器记录映射到模拟器武器状态（P1-7：从图鉴/攻略带入官方武器参数）。
//
// R1：冷却统一用 framesToSeconds（官方目录 stats.cooldown 单位是帧，60 帧 = 1 秒），
// 与图鉴显示（compendium.js formatCooldown）和攻略生成（strategyGenerator.js）同源，
// 避免在 app.js 再维护一份单位转换。独立成模块以便单元测试直接覆盖 SMG / Spear /
// 高阶武器等带入场景。
//
// F5：冷却保留完整帧精度（frames/60 原值），不做 2 位小数舍入——2 帧武器的
// 0.0333… 秒舍入成 0.03 秒会虚增约 11% DPS。展示层（app.js createNumberField）
// 负责 2 位小数显示，计算层（calculator/strategyGenerator）保持完整精度。
export function weaponRecordToSimulator(record) {
  const s = record.stats ?? {};
  const r2 = (x) => Math.round(x * 100) / 100;
  const weapon = structuredClone(DEFAULT_WEAPON);
  weapon.quantity = 1;
  weapon.baseDamage = s.damage ?? weapon.baseDamage;
  weapon.cooldown = framesToSeconds(s.cooldown ?? 60);
  weapon.hitsPerAttack = s.nb_projectiles ?? 1;
  weapon.critChance = r2((s.crit_chance ?? 0) * 100);
  weapon.critMultiplier = s.crit_damage ?? weapon.critMultiplier;
  weapon.piercing = s.piercing ?? 0;
  weapon.piercingDamageMultiplier = r2(1 - (s.piercing_dmg_reduction ?? 0.5));
  weapon.bounces = s.bounce ?? 0;
  weapon.bounceDamageMultiplier = r2(1 - (s.bounce_dmg_reduction ?? 0.5));
  // 缩放先全部归零再按记录覆盖：官方武器只声明它实际拥有的缩放维度，
  // 未声明的维度应为 0（而非沿用 DEFAULT_WEAPON 的默认值，如默认近战缩放 80），
  // 否则链枪（仅远程+工程缩放）会错误显示 80% 近战缩放。
  weapon.scaling = { meleeDamage: 0, rangedDamage: 0, elementalDamage: 0, engineering: 0 };
  (s.scalingStats ?? []).forEach((entry) => {
    const value = r2((entry.value ?? 0) * 100);
    if (entry.stat === "stat_melee_damage") weapon.scaling.meleeDamage = value;
    else if (entry.stat === "stat_ranged_damage") weapon.scaling.rangedDamage = value;
    else if (entry.stat === "stat_elemental_damage") weapon.scaling.elementalDamage = value;
    else if (entry.stat === "stat_engineering") weapon.scaling.engineering = value;
  });
  return weapon;
}