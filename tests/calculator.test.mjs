import assert from "node:assert/strict";
import {
  applyItemDelta,
  calculateWeaponDamage,
  compareItem,
} from "../src/calculator.js";

const baseStats = {
  damagePercent: 0,
  attackSpeed: 0,
  critChance: 0,
  meleeDamage: 0,
  rangedDamage: 0,
  elementalDamage: 0,
  engineering: 0,
};

function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

{
  const result = calculateWeaponDamage(
    {
      ...baseStats,
      damagePercent: 50,
      meleeDamage: 10,
    },
    {
      baseDamage: 20,
      cooldown: 1,
      quantity: 1,
      hitsPerAttack: 1,
      critChance: 0,
      critMultiplier: 2,
      scaling: {
        meleeDamage: 80,
      },
    },
  );

  closeTo(result.scaledDamage.raw, 28, "scaled damage includes stat scaling");
  closeTo(result.nonCritDamage, 42, "global damage percent applies");
  closeTo(result.dps, 42, "one hit per second gives matching DPS");
}

{
  const result = calculateWeaponDamage(
    {
      ...baseStats,
      critChance: 50,
    },
    {
      baseDamage: 100,
      cooldown: 1,
      quantity: 1,
      hitsPerAttack: 1,
      critChance: 0,
      critMultiplier: 2,
      scaling: {},
    },
  );

  closeTo(result.expectedDamage, 150, "crit chance contributes to expectation");
  closeTo(result.dps, 150, "crit expectation flows into DPS");
}

{
  const comparison = compareItem(
    baseStats,
    {
      baseDamage: 100,
      cooldown: 1,
      quantity: 1,
      hitsPerAttack: 1,
      critChance: 0,
      critMultiplier: 2,
      scaling: {},
    },
    {
      attackSpeed: 100,
    },
  );

  closeTo(comparison.before.dps, 100, "baseline DPS before item");
  closeTo(comparison.after.dps, 200, "100 attack speed doubles attacks");
  closeTo(comparison.dpsDeltaPercent, 100, "delta percent is computed");
}

{
  const result = calculateWeaponDamage(
    {
      ...baseStats,
      damagePercent: -200,
    },
    {
      baseDamage: 100,
      cooldown: 1,
      quantity: 1,
      hitsPerAttack: 1,
      critChance: 0,
      critMultiplier: 2,
      scaling: {},
    },
  );

  closeTo(result.nonCritDamage, 1, "damage is clamped to minimum 1");
}

{
  const after = applyItemDelta(
    {
      ...baseStats,
      meleeDamage: 4,
      damagePercent: 10,
    },
    {
      meleeDamage: 3,
      damagePercent: 5,
    },
  );

  closeTo(after.meleeDamage, 7, "item delta adds flat stat");
  closeTo(after.damagePercent, 15, "item delta adds percent stat");
}

console.log("calculator tests passed");
