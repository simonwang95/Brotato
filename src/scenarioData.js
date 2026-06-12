export const SCENARIOS = {
  boss: {
    id: "boss",
    name: "Boss / 精英单体",
    description: "目标少、清怪收益低，用来看单体输出和机制空转风险。",
    averageTargetsInRange: 1,
    averageLineTargets: 1,
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
    pickupRatePerSecond: 1.5,
    killRateMultiplier: 1.4,
    densityLabel: "高密度",
  },
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
};

export function getAvailableScenarios() {
  return Object.values(SCENARIOS);
}

export function getAvailableItemEffects() {
  return Object.values(ITEM_EFFECTS);
}
