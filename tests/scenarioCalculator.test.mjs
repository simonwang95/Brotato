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
  const result = calculateScenarioDps(
    baseStats,
    {
      ...baseWeapon,
      highHealthDamagePercent: 30,
    },
    "boss",
    "none",
    neutralDelivery,
  );

  closeTo(result.conditionalDamageBonusPercent, 15, "boss model weights above-health damage uptime");
  closeTo(result.rawBaseHitDps, 115, "weapon conditional damage increases expected boss DPS");
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

  closeTo(cyberball.expectedDamage, 5, "cyberball uses official 25% luck scaling");
  closeTo(cyberball.dps, 1.75, "cyberball uses kill rate and trigger chance");
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

  closeTo(cyberball.modifiedExpectedDamage, 10, "item-trigger damage uses damage percent");
  closeTo(cyberball.dps, 3.5, "damage percent increases cyberball dps");
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
  const riposte = calculateItemEffectDps(
    {
      ...baseStats,
      dodge: 50,
      meleeDamage: 20,
    },
    "normalWave",
    {
      id: "official:riposte",
      trigger: "onDodgeDamage",
      chance: 100,
      baseDamage: 0,
      luckScaling: 0,
      statScaling: {
        meleeDamage: 3,
      },
    },
  );

  closeTo(riposte.triggerRate, 0.5, "dodge damage uses incoming pressure and dodge chance");
  closeTo(riposte.expectedDamage, 60, "dodge damage uses official stat scaling");
  closeTo(riposte.dps, 30, "dodge damage produces trigger DPS");
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
  const coupon = calculateItemEffectDps(
    {
      ...baseStats,
      harvesting: 150,
      luck: 250,
    },
    "normalWave",
    {
      id: "official:shop-efficiency",
      trigger: "shopEfficiency",
      itemDiscountPercent: 5,
      rerollDiscountPercent: 25,
      freeRerolls: 1,
    },
  );

  closeTo(coupon.economyMultiplier, 1.85, "shop efficiency scales with economy route stats");
  closeTo(coupon.economyUtilityScore, 19.425, "shop efficiency combines discounts and free rerolls");
}

{
  const peacock = calculateItemEffectDps(
    {
      ...baseStats,
      harvesting: 150,
    },
    "normalWave",
    {
      id: "official:next-wave-xp",
      trigger: "nextWaveXpSurge",
      xpGainPercent: 100,
      enemyDamagePercent: 50,
    },
  );

  closeTo(peacock.riskMultiplier, 1.5, "next-wave xp applies enemy risk");
  closeTo(peacock.economyMultiplier, 1.35, "next-wave xp scales with economy route stats");
  closeTo(peacock.economyUtilityScore, 11.25, "next-wave xp produces risk-adjusted utility");
}

{
  const dynamite = calculateItemEffectDps(baseStats, "swarm", {
    id: "official:explosion-amplifier",
    trigger: "explosionAmplifier",
    explosionDamagePercent: 15,
    explosionSizePercent: 0,
  });

  closeTo(dynamite.explosionUtilityScore, 2, "explosion utility scales with density and explosion damage");
}

{
  const silverBullet = calculateItemEffectDps(baseStats, "boss", {
    id: "official:boss-damage-support",
    trigger: "conditionalDamageSupport",
    bossDamagePercent: 25,
  });
  const smallFish = calculateItemEffectDps(baseStats, "boss", {
    id: "official:high-health-damage-support",
    trigger: "conditionalDamageSupport",
    highHealthDamagePercent: 10,
  });
  const giantBelt = calculateItemEffectDps(
    { ...baseStats, critChance: 40 },
    "boss",
    {
      id: "official:giant-crit-support",
      trigger: "conditionalDamageSupport",
      giantCritDamageValue: 10,
    },
  );

  closeTo(silverBullet.conditionalDamageUtilityScore, 5, "boss damage uses the official percent");
  closeTo(smallFish.expectedHighHealthDamagePercent, 5, "high-health damage uses boss uptime");
  closeTo(smallFish.conditionalDamageUtilityScore, 1, "high-health damage stays conservative");
  closeTo(giantBelt.conditionalDamageUtilityScore, 2, "giant crit utility follows plan crit chance");
}

{
  const snake = calculateItemEffectDps({ ...baseStats, elementalDamage: 40 }, "swarm", {
    id: "official:burning-support",
    trigger: "burningSupport",
    burnSpreadTargets: 1,
    burningEnemyHpPercent: 0,
    burningCooldownReductionPercent: 0,
  });

  closeTo(snake.burningUtilityScore, 6, "burning utility scales with density and elemental route strength");
}

{
  const turret = calculateItemEffectDps({ ...baseStats, engineering: 40 }, "normalWave", {
    id: "official:structure-support",
    trigger: "structureSupport",
    structureCount: 1,
    structureAttackSpeedPercent: 10,
    structuresCooldownReductionPercent: 0,
    projectileBonus: 0,
  });

  closeTo(turret.structureUtilityScore, 4.5, "structure utility scales with engineering and structure fields");
}

{
  const pileOfBooks = calculateItemEffectDps(
    { ...baseStats, engineering: 40, critChance: 25 },
    "normalWave",
    {
      id: "official:structure-crit-support",
      trigger: "structureSupport",
      structureCount: 1,
      structureAttackSpeedPercent: 0,
      structuresCooldownReductionPercent: 0,
      projectileBonus: 0,
      structuresCanCrit: true,
      critChanceBonus: 5,
    },
  );

  closeTo(pileOfBooks.structureCritChance, 0.3, "structure crit uses the plan and item crit chance");
  closeTo(pileOfBooks.structureCritMultiplier, 1.3, "structure crit applies a 2x expected crit multiplier");
  closeTo(pileOfBooks.structureUtilityScore, 12.9, "structure crit support scales with engineering");
}

{
  const bandana = calculateItemEffectDps(
    {
      ...baseStats,
      rangedDamage: 40,
      damagePercent: 50,
    },
    "swarm",
    {
      id: "official:piercing-support",
      trigger: "piercingSupport",
      piercing: 1,
      critGated: false,
    },
  );

  closeTo(bandana.effectivePiercing, 1, "piercing support uses official piercing amount");
  closeTo(bandana.piercingUtilityScore, 9.8, "piercing support scales with density and ranged route strength");
}

{
  const eyepatch = calculateItemEffectDps(
    {
      ...baseStats,
      critChance: 50,
    },
    "swarm",
    {
      id: "official:crit-piercing-support",
      trigger: "piercingSupport",
      piercing: 1,
      critGated: true,
    },
  );

  closeTo(eyepatch.effectivePiercing, 0.5, "crit-gated piercing uses crit chance");
  closeTo(eyepatch.piercingUtilityScore, 2.8, "crit-gated piercing produces coverage utility");
}

{
  const customGrowth = calculateItemEffectDps({ ...baseStats, speed: 80 }, "normalWave", {
    id: "official:custom-growth",
    trigger: "customGrowthPotential",
    scaledPlanStat: "speed",
    sourceLabel: "移速 %",
    nbStatScaled: 1,
    permStatsOnly: true,
  });

  closeTo(customGrowth.sourceUnits, 80, "custom growth uses the selected source stat");
  closeTo(
    customGrowth.customGrowthUtilityScore,
    Math.log1p(80) * 1.4 * 1.15,
    "custom growth potential is a conservative logarithmic utility",
  );
}

{
  const endWaveGrowth = calculateItemEffectDps(baseStats, "normalWave", {
    id: "official:end-wave-growth",
    trigger: "endWaveStatGrowth",
    wavesRemaining: 8,
    statGains: [
      { statId: "meleeDamage", value: 3 },
      { statId: "engineering", value: 3 },
    ],
  });

  closeTo(endWaveGrowth.totalPerWaveGain, 6, "end-wave growth sums positive official stat gains");
  closeTo(endWaveGrowth.projectedStatGain, 48, "end-wave growth projects remaining waves");
  closeTo(endWaveGrowth.endWaveGrowthUtilityScore, 19.2, "end-wave growth produces utility score");
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
  const jerky = calculateItemEffectDps(baseStats, "normalWave", {
    id: "official:consumable-heal-over-time",
    trigger: "consumableHealBonus",
    healBonus: 3,
    healOverTimeBonus: 4,
    consumablePickupShare: 0.25,
  });

  closeTo(jerky.totalHealBonus, 7, "consumable healing combines instant and over-time values");
  closeTo(jerky.healingPerSecond, 1.4, "consumable over-time healing contributes sustain");
  closeTo(jerky.sustainUtilityScore, 11.2, "combined consumable healing produces sustain utility");
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
  const goblet = calculateItemEffectDps(baseStats, "normalWave", {
    id: "official:kill-heal",
    trigger: "onKillHealChance",
    chance: 15,
    healAmount: 1,
    critGated: false,
  });
  const tentacle = calculateItemEffectDps(
    { ...baseStats, critChance: 40 },
    "normalWave",
    {
      id: "official:crit-kill-heal",
      trigger: "onKillHealChance",
      chance: 20,
      healAmount: 1,
      critGated: true,
      critChanceBonus: 3,
    },
  );

  closeTo(goblet.healingPerSecond, 0.15, "kill healing uses the scenario kill rate");
  closeTo(goblet.sustainUtilityScore, 1.8, "kill healing produces sustain utility");
  closeTo(tentacle.critChance, 0.43, "crit-kill healing includes the item's crit bonus");
  closeTo(tentacle.healingPerSecond, 0.086, "crit-kill healing is gated by crit chance");
  closeTo(tentacle.sustainUtilityScore, 1.032, "crit-kill healing stays conservative");
}

{
  const fruitBasket = calculateItemEffectDps(baseStats, "swarm", {
    id: "official:fruit-drop-bonus",
    trigger: "enemyFruitDropBonus",
    fruitDropChancePercent: 1,
  });

  closeTo(fruitBasket.extraConsumablesPerSecond, 0.014, "fruit drops follow the scenario kill rate");
  closeTo(fruitBasket.consumableOpportunityScore, 0.7, "fruit drops add consumable opportunity");
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
