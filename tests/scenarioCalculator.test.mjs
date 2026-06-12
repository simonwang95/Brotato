import assert from "node:assert/strict";
import {
  calculateItemEffectDps,
  calculateScenarioDps,
} from "../src/scenarioCalculator.js";

const baseStats = {
  damagePercent: 0,
  attackSpeed: 0,
  critChance: 0,
  meleeDamage: 0,
  rangedDamage: 0,
  elementalDamage: 0,
  engineering: 0,
  luck: 0,
};

const baseWeapon = {
  baseDamage: 100,
  cooldown: 1,
  quantity: 1,
  hitsPerAttack: 1,
  critChance: 0,
  critMultiplier: 2,
  scaling: {},
};

function closeTo(actual, expected, message) {
  assert.ok(
    Math.abs(actual - expected) < 0.000001,
    `${message}: expected ${expected}, got ${actual}`,
  );
}

{
  const boss = calculateScenarioDps(baseStats, {
    ...baseWeapon,
    piercing: 3,
  }, "boss");
  const swarm = calculateScenarioDps(baseStats, {
    ...baseWeapon,
    piercing: 3,
  }, "swarm");

  closeTo(boss.piercingDps, 0, "piercing has no value against one target");
  assert.ok(swarm.piercingDps > boss.piercingDps, "piercing scales with line targets");
}

{
  const result = calculateScenarioDps(baseStats, {
    ...baseWeapon,
    bounces: 2,
    bounceDamageMultiplier: 0.5,
  }, "normalWave");

  closeTo(result.bounceExtraHits, 1, "two half-damage bounces equal one full hit");
  closeTo(result.bounceDps, 100, "bounce contribution is added to scenario DPS");
}

{
  const result = calculateScenarioDps(baseStats, {
    ...baseWeapon,
    explosionTargets: 10,
    explosionDamageMultiplier: 1,
  }, "normalWave");

  closeTo(result.explosionExtraHits, 3, "explosion targets are capped by nearby targets");
  closeTo(result.explosionDps, 300, "explosion extra targets add expected damage");
}

{
  const cyberball = calculateItemEffectDps(
    {
      ...baseStats,
      luck: 20,
    },
    "swarm",
    "cyberball",
  );

  closeTo(cyberball.expectedDamage, 21, "cyberball uses luck scaling");
  closeTo(cyberball.dps, 7.875, "cyberball uses pickup rate and trigger chance");
}

{
  const beardedBaby = calculateItemEffectDps(
    {
      ...baseStats,
      rangedDamage: 30,
    },
    "swarm",
    "babyWithABeard",
  );

  closeTo(beardedBaby.expectedDamage, 31, "bearded baby uses ranged damage scaling");
  closeTo(beardedBaby.dps, 43.4, "bearded baby uses kill-rate scenario scaling");
}

console.log("scenario calculator tests passed");
