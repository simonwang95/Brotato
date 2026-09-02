import { DEFAULT_WEAPON, framesToSeconds } from "./calculator.js";

// 把官方目录武器记录映射到模拟器武器状态（P1-7：从图鉴/攻略带入官方武器参数）。
//
// R1：冷却统一用 framesToSeconds（官方目录 stats.cooldown 单位是帧，60 帧 = 1 秒），
// 与图鉴显示（compendium.js formatCooldown）和攻略生成（strategyGenerator.js）同源，
// 避免在 app.js 再维护一份单位转换。独立成模块以便单元测试直接覆盖 SMG / Spear /
// 高阶武器等带入场景。
export function weaponRecordToSimulator(record) {
  const s = record.stats ?? {};
  const r2 = (x) => Math.round(x * 100) / 100;
  const weapon = structuredClone(DEFAULT_WEAPON);
  weapon.quantity = 1;
  weapon.baseDamage = s.damage ?? weapon.baseDamage;
  weapon.cooldown = r2(framesToSeconds(s.cooldown ?? 60));
  weapon.hitsPerAttack = s.nb_projectiles ?? 1;
  weapon.critChance = r2((s.crit_chance ?? 0) * 100);
  weapon.critMultiplier = s.crit_damage ?? weapon.critMultiplier;
  weapon.piercing = s.piercing ?? 0;
  weapon.piercingDamageMultiplier = r2(1 - (s.piercing_dmg_reduction ?? 0.5));
  weapon.bounces = s.bounce ?? 0;
  weapon.bounceDamageMultiplier = r2(1 - (s.bounce_dmg_reduction ?? 0.5));
  (s.scalingStats ?? []).forEach((entry) => {
    const value = r2((entry.value ?? 0) * 100);
    if (entry.stat === "stat_melee_damage") weapon.scaling.meleeDamage = value;
    else if (entry.stat === "stat_ranged_damage") weapon.scaling.rangedDamage = value;
    else if (entry.stat === "stat_elemental_damage") weapon.scaling.elementalDamage = value;
    else if (entry.stat === "stat_engineering") weapon.scaling.engineering = value;
  });
  return weapon;
}