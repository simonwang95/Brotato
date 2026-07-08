export const SCENARIOS = {
  boss: {
    id: "boss",
    name: "Boss / 精英单体",
    description: "目标少、清怪收益低，用来看单体输出和机制空转风险。",
    averageTargetsInRange: 1,
    averageLineTargets: 1,
    averageEnemyHp: 2000,
    overkillWasteWeight: 0.05,
    positioningStress: 0.7,
    pickupRatePerSecond: 0.2,
    killRateMultiplier: 0.4,
    densityLabel: "低密度",
  },
  normalWave: {
    id: "normalWave",
    name: "普通清怪",
    description: "常规波次估算，用来看武器和道具的通用清场能力。",
    averageTargetsInRange: 4,
    averageLineTargets: 2,
    averageEnemyHp: 80,
    overkillWasteWeight: 0.35,
    positioningStress: 1,
    pickupRatePerSecond: 0.8,
    killRateMultiplier: 1,
    densityLabel: "中密度",
  },
  swarm: {
    id: "swarm",
    name: "高密度怪潮 / 无尽",
    description: "怪多、拾取多，用来看穿透、弹射、AOE 和拾取触发的放大效果。",
    averageTargetsInRange: 8,
    averageLineTargets: 4,
    averageEnemyHp: 120,
    overkillWasteWeight: 0.55,
    positioningStress: 1.25,
    pickupRatePerSecond: 1.5,
    killRateMultiplier: 1.4,
    densityLabel: "高密度",
  },
};

export const DEFAULT_COMBAT_CONTEXT = {
  enemyArmor: 0,
  averageEnemyHp: 0,
  positioningHitLoss: 0,
  burnBaseDamage: 0,
  burnElementalScaling: 50,
  burnApplicationChance: 0,
  burnDuration: 3,
  burnTickRate: 1,
  burnSpreadChance: 0,
  burnSpreadTargets: 0,
  curseIntensity: 0,
  curseEnemyPowerPerPoint: 1,
  curseRewardPerPoint: 0.5,
  structureCount: 0,
  structureBaseDamage: 10,
  structureCooldown: 1.5,
  structureEngineeringScaling: 100,
  structureUptime: 100,
  structureHitChance: 85,
  structureTargets: 1,
  speedAvoidancePerPoint: 0.35,
  speedAvoidanceCap: 35,
};

export const ITEM_EFFECTS = {
  none: {
    id: "none",
    name: "无特殊道具",
    cnName: "无",
    trigger: "none",
    chance: 0,
    baseDamage: 0,
    luckScaling: 0,
    description: "只计算武器命中，不加入特殊道具触发。",
  },
  cyberball: {
    id: "cyberball",
    name: "Cyberball",
    cnName: "赛博球",
    trigger: "onPickup",
    chance: 25,
    baseDamage: 1,
    luckScaling: 1,
    description:
      "简化为拾取材料/消耗品时按概率触发，对随机目标造成随幸运成长的伤害。",
  },
  babyElephant: {
    id: "babyElephant",
    name: "Baby Elephant",
    cnName: "象宝宝",
    trigger: "onPickup",
    chance: 25,
    baseDamage: 1,
    luckScaling: 0.25,
    description:
      "简化为拾取消耗品/材料触发的随机目标伤害，用于和赛博球同类估算。",
  },
  babyWithABeard: {
    id: "babyWithABeard",
    name: "Baby with a Beard",
    cnName: "长胡子的婴儿",
    trigger: "onKill",
    chance: 100,
    baseDamage: 1,
    luckScaling: 0,
    statScaling: {
      rangedDamage: 1,
    },
    description:
      "简化为击杀触发的额外弹体，用场景击杀频率估算；具体数值待逐条校验。",
  },
  huntingTrophy: {
    id: "huntingTrophy",
    name: "Hunting Trophy",
    cnName: "狩猎战利品",
    trigger: "onCritKillMaterial",
    chance: 33,
    baseDamage: 0,
    luckScaling: 0,
    materialValue: 1,
    description:
      "按官方暴击击杀材料触发值估算经济收益；不计入伤害 DPS。",
  },
  metalDetector: {
    id: "metalDetector",
    name: "Metal Detector",
    cnName: "金属探测器",
    trigger: "onPickupMaterialBonus",
    chance: 5,
    baseDamage: 0,
    luckScaling: 0,
    materialValue: 1,
    description:
      "按官方双倍材料概率估算额外材料期望；不计入伤害 DPS。",
  },
  crown: {
    id: "crown",
    name: "Crown",
    cnName: "王冠",
    trigger: "harvestingGrowth",
    chance: 100,
    baseDamage: 0,
    luckScaling: 0,
    growthPercent: 8,
    description:
      "按官方收获成长百分比估算额外收获等效值；不计入伤害 DPS。",
  },
  bag: {
    id: "bag",
    name: "Bag",
    cnName: "袋子",
    trigger: "crateMaterialBonus",
    chance: 100,
    baseDamage: 0,
    luckScaling: 0,
    crateMaterialValue: 15,
    description:
      "按官方箱子材料奖励估算经济潜力；不计入伤害 DPS，也不假设箱子掉落频率。",
  },
  piggyBank: {
    id: "piggyBank",
    name: "Piggy Bank",
    cnName: "存钱罐",
    trigger: "startWaveSavings",
    chance: 100,
    baseDamage: 0,
    luckScaling: 0,
    savingsPercent: 8,
    description:
      "按官方波次开始材料百分比收益估算经济潜力；不计入伤害 DPS，也不假设具体持有材料数。",
  },
  babyGecko: {
    id: "babyGecko",
    name: "Baby Gecko",
    cnName: "壁虎宝宝",
    trigger: "pickupUtility",
    chance: 100,
    baseDamage: 0,
    luckScaling: 0,
    pickupAttraction: 25,
    description:
      "简化为提高材料和消耗品吸入效率，用场景拾取频率估算额外触发机会。",
  },
  sifdsRelic: {
    id: "sifdsRelic",
    name: "Sifd's Relic",
    cnName: "Sifd的圣物",
    trigger: "pickupUtility",
    chance: 100,
    baseDamage: 0,
    luckScaling: 0,
    pickupAttraction: 100,
    description:
      "简化为全屏拾取带来的额外拾取节奏，用于估算 Lucky 等拾取触发路线收益。",
  },
};

export function getAvailableScenarios() {
  return Object.values(SCENARIOS);
}

export function getAvailableItemEffects() {
  return Object.values(ITEM_EFFECTS);
}
