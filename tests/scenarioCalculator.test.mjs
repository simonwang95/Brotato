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

const neutralDelivery = {
  combatContext: {
    averageEnemyHp: 1000,
  },
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
  }, "boss", "none", neutralDelivery);
  const swarm = calculateScenarioDps(baseStats, {
    ...baseWeapon,
    piercing: 3,
  }, "swarm", "none", neutralDelivery);

  closeTo(boss.piercingDps, 0, "piercing has no value against one target");
  assert.ok(swarm.piercingDps > boss.piercingDps, "piercing scales with line targets");
}

{
  const result = calculateScenarioDps(baseStats, {
    ...baseWeapon,
    bounces: 2,
    bounceDamageMultiplier: 0.5,
  }, "normalWave", "none", neutralDelivery);

  closeTo(result.bounceExtraHits, 1, "two half-damage bounces equal one full hit");
  closeTo(result.bounceDps, 100, "bounce contribution is added to scenario DPS");
}

{
  const result = calculateScenarioDps(baseStats, {
    ...baseWeapon,
    explosionTargets: 10,
    explosionDamageMultiplier: 1,
  }, "normalWave", "none", neutralDelivery);

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
  const cyberball = calculateItemEffectDps(
    {
      ...baseStats,
      damagePercent: 100,
      luck: 20,
    },
    "swarm",
    "cyberball",
  );

  closeTo(cyberball.modifiedExpectedDamage, 42, "item-trigger damage uses damage percent");
  closeTo(cyberball.dps, 15.75, "damage percent increases cyberball dps");
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

{
  const result = calculateScenarioDps(
    baseStats,
    {
      ...baseWeapon,
      baseDamage: 200,
    },
    "normalWave",
    "none",
    {
      combatContext: {
        enemyArmor: 15,
        averageEnemyHp: 80,
        positioningHitLoss: 20,
      },
    },
  );

  closeTo(result.enemyArmorMultiplier, 0.5, "enemy armor halves damage at 15 armor in the approximation");
  assert.ok(result.overflowLoss > 0, "average enemy hp creates overkill waste");
  assert.ok(result.positioningHitLoss > 0, "positioning loss is applied");
  assert.ok(result.scenarioWeaponDps < result.rawScenarioWeaponDps, "delivery losses reduce effective weapon dps");
}

{
  const result = calculateScenarioDps(
    {
      ...baseStats,
      elementalDamage: 10,
    },
    baseWeapon,
    "normalWave",
    "none",
    {
      combatContext: {
        averageEnemyHp: 1000,
        burnBaseDamage: 5,
        burnElementalScaling: 50,
        burnApplicationChance: 100,
        burnDuration: 1,
        burnTickRate: 1,
        burnSpreadChance: 50,
        burnSpreadTargets: 2,
      },
    },
  );

  closeTo(result.burning.burnDamage, 10, "burning uses base damage and elemental scaling");
  closeTo(result.burning.uptime, 1 - Math.exp(-1), "burn refresh uses hit-rate uptime");
  closeTo(result.burning.spreadMultiplier, 2, "burn spread adds nearby targets by chance");
}

{
  const result = calculateScenarioDps(
    {
      ...baseStats,
      engineering: 20,
    },
    baseWeapon,
    "boss",
    "none",
    {
      combatContext: {
        averageEnemyHp: 1000,
        structureCount: 2,
        structureBaseDamage: 10,
        structureCooldown: 2,
        structureEngineeringScaling: 100,
        structureUptime: 100,
        structureHitChance: 100,
        structureTargets: 1,
      },
    },
  );

  closeTo(result.structures.structureDamage, 30, "structures scale independently from engineering");
  closeTo(result.structures.dps, 30, "two structures firing every two seconds produce one shot per second");
}

{
  const result = calculateScenarioDps(baseStats, baseWeapon, "boss", "none", {
    combatContext: {
      averageEnemyHp: 1000,
      curseIntensity: 20,
      curseEnemyPowerPerPoint: 1,
      curseRewardPerPoint: 0.5,
    },
  });

  closeTo(result.curse.enemyPowerMultiplier, 1.2, "curse increases enemy power");
  closeTo(result.curse.rewardMultiplier, 1.1, "curse increases reward value");
  assert.ok(result.effectiveClearScore < result.totalDps, "enemy power can outweigh reward in clear score");
}

{
  const result = calculateScenarioDps(
    {
      ...baseStats,
      dodge: 50,
      speed: 100,
    },
    baseWeapon,
    "boss",
    "none",
    {
      combatContext: {
        averageEnemyHp: 1000,
        speedAvoidancePerPoint: 0.35,
        speedAvoidanceCap: 35,
      },
    },
  );

  closeTo(result.survival.speedAvoidance, 0.35, "speed adds capped avoidance");
  closeTo(result.survival.effectiveAvoidance, 0.675, "dodge and speed avoidance compound");
  closeTo(result.survival.incomingDamageMultiplier, 0.325, "avoidance lowers incoming damage");
}

console.log("scenario calculator tests passed");
