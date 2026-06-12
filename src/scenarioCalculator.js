import { calculateWeaponDamage, normalizeStats, normalizeWeapon } from "./calculator.js";
import { ITEM_EFFECTS, SCENARIOS } from "./scenarioData.js";

function resolveScenario(scenarioId) {
  const scenario = SCENARIOS[scenarioId];
  if (!scenario) throw new Error(`Unknown scenario id: ${scenarioId}`);
  return scenario;
}

function resolveItemEffect(itemEffectId) {
  const itemEffect = ITEM_EFFECTS[itemEffectId] ?? ITEM_EFFECTS.none;
  if (!itemEffect) throw new Error(`Unknown item effect id: ${itemEffectId}`);
  return itemEffect;
}

export function calculateScenarioHitModel(stats, weapon, scenarioId, options = {}) {
  const scenario = resolveScenario(scenarioId);
  const normalizedWeapon = normalizeWeapon(weapon);
  const base = calculateWeaponDamage(stats, normalizedWeapon, options);
  const baseHitRate =
    base.attacksPerSecond * normalizedWeapon.quantity * normalizedWeapon.hitsPerAttack;

  const lineExtraTargets = Math.max(0, scenario.averageLineTargets - 1);
  const nearbyExtraTargets = Math.max(0, scenario.averageTargetsInRange - 1);
  const piercingExtraHits =
    Math.min(normalizedWeapon.piercing, lineExtraTargets) *
    normalizedWeapon.piercingDamageMultiplier;
  const bounceExtraHits =
    Math.min(normalizedWeapon.bounces, nearbyExtraTargets) *
    normalizedWeapon.bounceDamageMultiplier;
  const explosionExtraHits =
    Math.min(normalizedWeapon.explosionTargets, nearbyExtraTargets) *
    normalizedWeapon.explosionDamageMultiplier;

  const contributionFromHits = (extraHits) =>
    base.expectedDamage * baseHitRate * extraHits;

  const piercingDps = contributionFromHits(piercingExtraHits);
  const bounceDps = contributionFromHits(bounceExtraHits);
  const explosionDps = contributionFromHits(explosionExtraHits);
  const extraDps = piercingDps + bounceDps + explosionDps;

  return {
    scenario,
    weapon: normalizedWeapon,
    base,
    baseHitRate,
    baseHitDps: base.dps,
    piercingExtraHits,
    bounceExtraHits,
    explosionExtraHits,
    piercingDps,
    bounceDps,
    explosionDps,
    extraDps,
    scenarioWeaponDps: base.dps + extraDps,
  };
}

export function calculateItemEffectDps(stats, scenarioId, itemEffectId = "none") {
  const normalizedStats = normalizeStats(stats);
  const scenario = resolveScenario(scenarioId);
  const itemEffect = resolveItemEffect(itemEffectId);

  if (itemEffect.trigger === "none") {
    return {
      itemEffect,
      scenario,
      triggerRate: 0,
      expectedDamage: 0,
      dps: 0,
    };
  }

  const triggerRate =
    itemEffect.trigger === "onPickup"
      ? scenario.pickupRatePerSecond
      : itemEffect.trigger === "onKill"
        ? scenario.killRateMultiplier
        : 0;
  const chance = itemEffect.chance / 100;
  const statScalingDamage = Object.entries(itemEffect.statScaling ?? {}).reduce(
    (sum, [statId, scaling]) => sum + (normalizedStats[statId] ?? 0) * scaling,
    0,
  );
  const expectedDamage = Math.max(
    0,
    itemEffect.baseDamage +
      normalizedStats.luck * itemEffect.luckScaling +
      statScalingDamage,
  );
  const dps = triggerRate * chance * expectedDamage;

  return {
    itemEffect,
    scenario,
    triggerRate,
    expectedDamage,
    dps,
  };
}

export function calculateScenarioDps(
  stats,
  weapon,
  scenarioId = "normalWave",
  itemEffectId = "none",
  options = {},
) {
  const hitModel = calculateScenarioHitModel(stats, weapon, scenarioId, options);
  const itemEffect = calculateItemEffectDps(stats, scenarioId, itemEffectId);
  const totalDps = hitModel.scenarioWeaponDps + itemEffect.dps;

  return {
    ...hitModel,
    itemEffect,
    totalDps,
  };
}
