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
  const babyGecko = calculateItemEffectDps(
    {
      ...baseStats,
      luck: 300,
    },
    "swarm",
    "babyGecko",
  );

  closeTo(babyGecko.extraPickupRate, 0.375, "baby gecko adds pickup opportunities");
  closeTo(babyGecko.pickupUtilityScore, 5.625, "luck routes amplify pickup utility scoring");
}

{
  const huntingTrophy = calculateItemEffectDps(
    {
      ...baseStats,
      critChance: 50,
    },
    "normalWave",
    "huntingTrophy",
  );

  closeTo(huntingTrophy.extraMaterialRate, 0.165, "hunting trophy uses crit-kill chance");
  closeTo(huntingTrophy.economyUtilityScore, 3.3, "crit-kill materials produce economy utility");
}

{
  const metalDetector = calculateItemEffectDps(baseStats, "swarm", "metalDetector");

  closeTo(metalDetector.extraMaterialRate, 0.075, "metal detector uses pickup rate and double-material chance");
  closeTo(metalDetector.economyUtilityScore, 1.5, "double-material chance produces economy utility");
}

{
  const blackFlag = calculateItemEffectDps(baseStats, "normalWave", {
    id: "official:cursed-kill-material",
    trigger: "cursedKillMaterial",
    materialValue: 1,
    curseGain: 5,
    enemyCountPercent: 10,
    enemyHealthPercent: 10,
    enemyDamagePercent: 10,
  });

  closeTo(blackFlag.extraMaterialRate, 0.055, "cursed kill material uses curse share and enemy count");
  assert.ok(
    blackFlag.economyUtilityScore > 2,
    "cursed kill material produces risk-adjusted economy utility",
  );
}

{
  const starfish = calculateItemEffectDps(baseStats, "normalWave", {
    id: "official:enemy-gold-drops",
    trigger: "enemyGoldDropBonus",
    goldDropBonusPercent: 20,
    enemyDamagePercent: 15,
  });

  closeTo(starfish.extraMaterialRate, 0.2, "enemy gold drops use kill-rate scenario scaling");
  assert.ok(starfish.economyUtilityScore > 3, "enemy gold drops produce risk-adjusted economy utility");
}

{
  const fishHook = calculateItemEffectDps(baseStats, "normalWave", {
    id: "official:curse-shop-potential",
    trigger: "curseShopPotential",
    curseLockedChance: 20,
    curseGain: 1,
  });

  closeTo(fishHook.economyUtilityScore, 3, "curse shop potential uses lock chance and curse gain");
}

{
  const crown = calculateItemEffectDps(
    {
      ...baseStats,
      harvesting: 100,
    },
    "normalWave",
    "crown",
  );

  closeTo(crown.extraHarvesting, 8, "crown uses harvesting growth percentage");
  closeTo(crown.economyUtilityScore, 8, "harvesting growth produces economy utility");
}

{
  const bag = calculateItemEffectDps(baseStats, "normalWave", "bag");

  closeTo(bag.extraMaterialPerCrate, 15, "bag uses official crate material value");
  closeTo(bag.economyUtilityScore, 3.75, "crate material bonus produces economy utility");
}

{
  const piggyBank = calculateItemEffectDps(baseStats, "normalWave", "piggyBank");

  closeTo(piggyBank.savingsPercent, 8, "piggy bank uses official savings percent");
  closeTo(piggyBank.economyUtilityScore, 4, "start-wave savings produce economy utility");
}

{
  const sifdsRelic = calculateItemEffectDps(baseStats, "normalWave", "sifdsRelic");

  closeTo(sifdsRelic.pickupMultiplier, 2, "sifd's relic models full pickup attraction");
  closeTo(sifdsRelic.pickupUtilityScore, 8, "full attraction has strong normal-wave utility");
}

{
  const pickupHeal = calculateItemEffectDps(baseStats, "swarm", {
    id: "official:pickup-heal",
    trigger: "onPickupHealChance",
    chance: 8,
    healAmount: 1,
  });

  closeTo(pickupHeal.healingPerSecond, 0.12, "pickup healing uses pickup rate and chance");
  closeTo(pickupHeal.sustainUtilityScore, 2.4, "pickup healing produces sustain utility");
}

{
  const consumableHeal = calculateItemEffectDps(baseStats, "normalWave", {
    id: "official:consumable-heal",
    trigger: "consumableHealBonus",
    healBonus: 2,
    consumablePickupShare: 0.25,
  });

  closeTo(
    consumableHeal.healingPerSecond,
    0.4,
    "consumable healing uses estimated consumable pickup share",
  );
  closeTo(consumableHeal.sustainUtilityScore, 3.2, "consumable healing produces sustain utility");
}

{
  const dodgeHeal = calculateItemEffectDps({ ...baseStats, dodge: 60 }, "normalWave", {
    id: "official:dodge-heal",
    trigger: "onDodgeHeal",
    chance: 50,
    healAmount: 5,
  });

  closeTo(dodgeHeal.healingPerSecond, 1.5, "dodge healing uses dodge target and trigger chance");
  closeTo(dodgeHeal.sustainUtilityScore, 9, "dodge healing produces sustain utility");
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
