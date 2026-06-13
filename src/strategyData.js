export const MODES = {
  normal20: {
    id: "normal20",
    label: "20 关通关",
    description: "目标是在第 20 波前成型，输出和生存阈值都要稳。",
  },
  endless: {
    id: "endless",
    label: "无尽模式",
    description: "第 20 波后继续成长，更重视经济、成长性、范围清怪和后期生存。",
  },
};

export const DANGER_LEVELS = {
  danger0: {
    id: "danger0",
    label: "危险 0",
    survivabilityMultiplier: 1,
    note: "标准难度，按基础目标面板执行。",
  },
  danger3: {
    id: "danger3",
    label: "危险 3",
    survivabilityMultiplier: 1.12,
    note: "中高危险，建议提前补护甲、生命和移速。",
  },
  danger5: {
    id: "danger5",
    label: "危险 5",
    survivabilityMultiplier: 1.25,
    note: "最高危险，生存阈值要更早到位，少拿纯贪经济项。",
  },
};

export const DLC_OPTIONS = {
  allowDlc: {
    id: "allowDlc",
    label: "允许 DLC",
    allowDlc: true,
    note: "允许推荐深海魔怪等 DLC 内容。",
  },
  baseOnly: {
    id: "baseOnly",
    label: "仅原版",
    allowDlc: false,
    note: "隐藏官方目录中来自 DLC 的武器和道具。",
  },
};

export const UNLOCK_OPTIONS = {
  allowUnlocks: {
    id: "allowUnlocks",
    label: "允许解锁物",
    allowRareUnlocks: true,
    note: "可推荐需要角色通关或挑战解锁的武器/道具。",
  },
  defaultOnly: {
    id: "defaultOnly",
    label: "只看默认池",
    allowRareUnlocks: false,
    note: "隐藏官方目录标记为非默认解锁的条目。",
  },
};

export const PREFERENCES = {
  stable: {
    id: "stable",
    label: "稳健通关",
    keywords: [],
    tags: [],
  },
  damage: {
    id: "damage",
    label: "极限输出",
    keywords: ["输出", "伤害", "暴击", "攻速"],
    tags: ["Gun", "Precise"],
  },
  engineering: {
    id: "engineering",
    label: "工程流",
    keywords: ["工程", "结构", "炮塔", "地雷"],
    tags: ["Engineering", "Tool"],
  },
  elemental: {
    id: "elemental",
    label: "元素流",
    keywords: ["元素", "燃烧", "点燃"],
    tags: ["Elemental"],
  },
  ranged: {
    id: "ranged",
    label: "远程流",
    keywords: ["远程", "弹射", "枪械"],
    tags: ["Ranged", "Gun"],
  },
  melee: {
    id: "melee",
    label: "近战流",
    keywords: ["近战", "徒手"],
    tags: ["Melee", "Unarmed"],
  },
};

export const STAT_LABELS = {
  maxHp: "最大生命",
  hpRegen: "生命再生",
  lifeSteal: "生命窃取 %",
  armor: "护甲",
  dodge: "闪避 %",
  damagePercent: "总伤害 %",
  attackSpeed: "攻速 %",
  critChance: "暴击率 %",
  meleeDamage: "近战伤害",
  rangedDamage: "远程伤害",
  elementalDamage: "元素伤害",
  engineering: "工程学",
  range: "范围",
  speed: "移速 %",
  harvesting: "收获",
  luck: "幸运",
};

export const WEAPONS = {
  smg: {
    id: "smg",
    name: "SMG",
    cnName: "冲锋枪",
    type: "远程",
    unlock: "默认可用；Ranger 可作为起始武器。",
    tags: ["Gun", "Ranged"],
  },
  pistol: {
    id: "pistol",
    name: "Pistol",
    cnName: "手枪",
    type: "远程",
    unlock: "默认可用。",
    tags: ["Gun", "Ranged"],
  },
  revolver: {
    id: "revolver",
    name: "Revolver",
    cnName: "左轮手枪",
    type: "远程",
    unlock: "默认可用。",
    tags: ["Gun", "Ranged"],
  },
  spear: {
    id: "spear",
    name: "Spear",
    cnName: "长矛",
    type: "近战",
    unlock: "默认可用。",
    tags: ["Medieval", "Melee"],
  },
  stick: {
    id: "stick",
    name: "Stick",
    cnName: "木棍",
    type: "近战",
    unlock: "默认可用。",
    tags: ["Primitive", "Melee"],
  },
  fist: {
    id: "fist",
    name: "Fist",
    cnName: "拳",
    type: "徒手近战",
    unlock: "默认可用；Brawler 可作为起始武器。",
    tags: ["Unarmed", "Melee"],
  },
  hand: {
    id: "hand",
    name: "Hand",
    cnName: "手掌",
    type: "徒手辅助",
    unlock: "默认可用。",
    tags: ["Unarmed", "Support"],
  },
  powerFist: {
    id: "powerFist",
    name: "Power Fist",
    cnName: "强拳",
    type: "徒手近战",
    unlock: "用 Brawler 赢得一局后解锁。",
    tags: ["Unarmed", "Melee"],
  },
  knife: {
    id: "knife",
    name: "Knife",
    cnName: "小刀",
    type: "近战暴击",
    unlock: "默认可用；Crazy 可作为起始武器。",
    tags: ["Precise", "Melee"],
  },
  thiefDagger: {
    id: "thiefDagger",
    name: "Thief Dagger",
    officialNameKey: "WEAPON_DAGGER",
    cnName: "盗贼匕首",
    type: "近战经济",
    unlock: "默认可用。",
    tags: ["Precise", "Melee"],
  },
  wand: {
    id: "wand",
    name: "Wand",
    cnName: "魔杖",
    type: "元素远程",
    unlock: "默认可用；Mage 可作为起始武器。",
    tags: ["Elemental"],
  },
  taser: {
    id: "taser",
    name: "Taser",
    cnName: "电击枪",
    type: "元素控制",
    unlock: "默认可用。",
    tags: ["Elemental", "Support"],
  },
  torch: {
    id: "torch",
    name: "Torch",
    cnName: "火把",
    type: "元素近战",
    unlock: "默认可用。",
    tags: ["Elemental", "Melee"],
  },
  thunderSword: {
    id: "thunderSword",
    name: "Thunder Sword",
    cnName: "雷剑",
    type: "元素近战",
    unlock: "用 Mage 赢得一局后解锁。",
    tags: ["Elemental", "Melee"],
  },
  wrench: {
    id: "wrench",
    name: "Wrench",
    cnName: "扳手",
    type: "工程结构",
    unlock: "默认可用；Engineer 可作为起始武器。",
    tags: ["Tool", "Engineering"],
  },
  screwdriver: {
    id: "screwdriver",
    name: "Screwdriver",
    cnName: "螺丝刀",
    type: "工程地雷",
    unlock: "默认可用。",
    tags: ["Tool", "Engineering"],
  },
  slingshot: {
    id: "slingshot",
    name: "Slingshot",
    cnName: "弹弓",
    type: "远程弹射",
    unlock: "默认可用；Lucky 可作为起始武器。",
    tags: ["Primitive", "Ranged"],
  },
  rock: {
    id: "rock",
    name: "Rock",
    cnName: "石头",
    type: "近战生存",
    unlock: "默认可用；Lucky 可作为起始武器。",
    tags: ["Primitive", "Melee"],
  },
  pruner: {
    id: "pruner",
    name: "Pruner",
    cnName: "修枝剪",
    type: "收获续航",
    unlock: "默认可用；Lucky 可作为起始武器。",
    tags: ["Support"],
  },
  lute: {
    id: "lute",
    name: "Lute",
    cnName: "琉特琴",
    type: "幸运乐器",
    unlock: "深海魔怪 DLC 武器；官方目录显示默认解锁、可掉落。",
    tags: ["Musical", "Luck"],
  },
};

export const ITEMS = {
  coffee: {
    id: "coffee",
    name: "Coffee",
    cnName: "咖啡",
    unlock: "默认道具池，无需角色解锁。",
    role: "攻速补强",
  },
  wings: {
    id: "wings",
    name: "Wings",
    cnName: "翅膀",
    unlock: "默认道具池，无需角色解锁。",
    role: "移速和生存空间",
  },
  coupon: {
    id: "coupon",
    name: "Coupon",
    cnName: "优惠券",
    unlock: "默认道具池，无需角色解锁。",
    role: "经济折扣",
  },
  lemonade: {
    id: "lemonade",
    name: "Lemonade",
    cnName: "柠檬水",
    unlock: "默认道具池，无需角色解锁。",
    role: "消耗品回复",
  },
  scaredSausage: {
    id: "scaredSausage",
    name: "Scared Sausage",
    cnName: "害怕的香肠",
    unlock: "默认道具池，无需角色解锁。",
    role: "点燃入口",
  },
  snake: {
    id: "snake",
    name: "Snake",
    cnName: "蛇",
    unlock: "默认道具池，无需角色解锁。",
    role: "燃烧传播",
  },
  turret: {
    id: "turret",
    name: "Turret",
    cnName: "炮塔",
    unlock: "默认结构道具池；同时拥有 5 个炮塔可解锁 Engineer。",
    role: "工程输出",
  },
  huntingTrophy: {
    id: "huntingTrophy",
    name: "Hunting Trophy",
    cnName: "狩猎战利品",
    unlock: "用 Crazy 赢得一局后解锁。",
    role: "暴击经济",
  },
  nightGoggles: {
    id: "nightGoggles",
    name: "Night Goggles",
    cnName: "夜视镜",
    unlock: "用 Ranger 赢得一局后解锁。",
    role: "远程暴击",
  },
  robotArm: {
    id: "robotArm",
    name: "Robot Arm",
    cnName: "机械臂",
    unlock: "用 Engineer 赢得一局后解锁。",
    role: "工程学成长",
  },
  potato: {
    id: "potato",
    name: "Potato",
    cnName: "土豆",
    unlock: "用 Well Rounded 赢得一局后解锁。",
    role: "全属性补强",
  },
  powerGenerator: {
    id: "powerGenerator",
    name: "Power Generator",
    cnName: "发电机",
    unlock: "用 Streamer 赢得一局后解锁。",
    role: "移速转输出",
  },
  whetstone: {
    id: "whetstone",
    name: "Whetstone",
    cnName: "磨刀石",
    unlock: "用 Sick 赢得一局后解锁。",
    role: "近战和回复",
  },
  cyberball: {
    id: "cyberball",
    name: "Cyberball",
    cnName: "赛博球",
    unlock: "默认道具池，无需角色解锁。",
    role: "幸运拾取伤害",
  },
  babyElephant: {
    id: "babyElephant",
    name: "Baby Elephant",
    cnName: "象宝宝",
    unlock: "默认道具池，无需角色解锁。",
    role: "幸运拾取伤害",
  },
  luckyCharm: {
    id: "luckyCharm",
    name: "Lucky Charm",
    cnName: "护身符",
    unlock: "用 Lucky 赢得一局后解锁。",
    role: "幸运成长",
  },
  babyWithABeard: {
    id: "babyWithABeard",
    name: "Baby with a Beard",
    cnName: "长胡子的婴儿",
    unlock: "官方目录显示默认解锁、可掉落。",
    role: "击杀连锁弹体",
  },
  babyGecko: {
    id: "babyGecko",
    name: "Baby Gecko",
    cnName: "壁虎宝宝",
    unlock: "官方目录显示默认解锁、可掉落。",
    role: "拾取范围和材料回收",
  },
  sifdsRelic: {
    id: "sifdsRelic",
    name: "Sifd's Relic",
    cnName: "圣物",
    unlock: "官方目录显示默认解锁、可掉落。",
    role: "全屏拾取节奏",
  },
};

const defaultSourceNotes = [
  "Brotato Wiki: Characters 页确认角色总数、默认角色和角色有独立属性/起始武器。",
  "Brotato Wiki: Progress 页确认角色挑战、部分角色和道具/武器解锁关系。",
  "Brotato Wiki: Endless Mode 页确认无尽模式 20 波后的规则变化。",
];

function weaponPlan(weaponIds) {
  return weaponIds.map((weaponId, index) => ({
    weaponId,
    priority: index === 0 ? "主推荐" : index === 1 ? "替代" : "补充",
    reason:
      index === 0
        ? "最贴合这个角色的成长方向，优先凑满同类武器。"
        : "当主路线商店不顺时使用，避免前期武器数量断档。",
  }));
}

function itemPlan(itemIds) {
  return itemIds.map((itemId, index) => ({
    itemId,
    priority: index === 0 ? "核心" : index === 1 ? "高" : "补充",
    reason:
      index === 0
        ? "最贴合该角色的主要节奏，看到时优先考虑。"
        : "用于补足输出、生存或经济短板。",
  }));
}

function scaleTargets(targets, multipliers) {
  return Object.fromEntries(
    Object.entries(targets).map(([statId, range]) => [
      statId,
      multipliers[statId] ? range.map((value) => Math.round(value * multipliers[statId])) : range,
    ]),
  );
}

function makeSeedPlans(config) {
  const endlessTargets = scaleTargets(config.targets, {
    maxHp: 1.25,
    armor: 1.25,
    dodge: 1.35,
    hpRegen: 1.35,
    lifeSteal: 1.3,
    damagePercent: 1.35,
    attackSpeed: 1.35,
    critChance: 1.25,
    meleeDamage: 1.25,
    rangedDamage: 1.25,
    elementalDamage: 1.25,
    engineering: 1.25,
    speed: 1.35,
    harvesting: 1.6,
    luck: 1.5,
    range: 1.25,
  });

  return {
    normal20: {
      stance: config.normalStance,
      recommendedWeapons: weaponPlan(config.weapons),
      avoid: config.avoid,
      keyItems: itemPlan(config.items),
      statPriority: config.statPriority,
      wave20Targets: config.targets,
      rhythm: config.rhythm,
    },
    endless: {
      stance: config.endlessStance ?? `${config.normalStance} 无尽中更重视经济成长、范围覆盖和后期生存。`,
      recommendedWeapons: weaponPlan(config.endlessWeapons ?? config.weapons),
      avoid: config.endlessAvoid ?? config.avoid,
      keyItems: itemPlan(config.endlessItems ?? config.items),
      statPriority: config.endlessStatPriority ?? {
        early: config.statPriority.early,
        mid: ["harvesting", "luck", ...config.statPriority.mid].slice(0, 5),
        late: ["damagePercent", "dodge", "speed", ...config.statPriority.late].slice(0, 5),
      },
      wave20Targets: endlessTargets,
      rhythm: config.endlessRhythm ?? [
        "第 20 波前先保证当前路线能稳定清怪。",
        "无尽开始前把经济优势换成真实战斗属性，不要只囤成长。",
        "后期优先维持移速、护甲、闪避和范围，避免输出够但活不下来。",
      ],
    },
  };
}

export const CHARACTER_GUIDES = {
  wellRounded: {
    id: "wellRounded",
    name: "Well Rounded",
    cnHint: "全能者，泛用角色",
    unlock: "默认 5 个角色之一，无需解锁。",
    summary:
      "没有极端限制，适合用来建立标准通关模板：先统一武器，再把输出、生存和经济补到均衡。",
    sourceNotes: defaultSourceNotes,
    plans: {
      normal20: {
        stance: "选择一种缩放清晰的武器一路合成，避免同时投资近战、远程和元素。",
        recommendedWeapons: [
          {
            weaponId: "smg",
            priority: "主推荐",
            reason: "远程伤害和攻速收益直观，清怪和 Boss 都稳定。",
          },
          {
            weaponId: "spear",
            priority: "替代",
            reason: "范围较舒服，近战伤害和攻速都能转成可靠清怪。",
          },
          {
            weaponId: "stick",
            priority: "替代",
            reason: "同类武器堆满后性价比高，适合普通 20 关稳通。",
          },
        ],
        avoid:
          "不要在第 8 波前同时买三种以上输出路线；混伤会让升级和商店选择变散。",
        keyItems: [
          {
            itemId: "coffee",
            priority: "高",
            reason: "让大多数武器更早跨过清怪阈值。",
          },
          {
            itemId: "coupon",
            priority: "高",
            reason: "前中期折扣等于更多武器合成和补生存机会。",
          },
          {
            itemId: "potato",
            priority: "核心解锁",
            reason: "解锁后是泛用全属性补强，适合这个角色的均衡路线。",
          },
        ],
        statPriority: {
          early: ["主伤害属性", "attackSpeed", "damagePercent", "harvesting"],
          mid: ["armor", "maxHp", "lifeSteal 或 hpRegen", "speed"],
          late: ["critChance", "range", "luck"],
        },
        wave20Targets: {
          maxHp: [60, 80],
          armor: [7, 11],
          dodge: [10, 35],
          lifeSteal: [6, 12],
          damagePercent: [45, 85],
          attackSpeed: [35, 80],
          critChance: [15, 45],
          rangedDamage: [25, 45],
          meleeDamage: [25, 45],
          speed: [5, 15],
          harvesting: [30, 80],
        },
        rhythm: [
          "前 5 波优先凑齐同类武器，不要为了稀有道具牺牲武器密度。",
          "第 6-12 波开始补护甲和最大生命，输出够清怪后优先不暴毙。",
          "第 13 波后只买能明确提高当前路线的属性或关键生存阈值。",
        ],
      },
      endless: {
        stance: "把普通通关路线改成成长路线：经济、全属性、范围清怪和后期防御更重要。",
        recommendedWeapons: [
          {
            weaponId: "smg",
            priority: "主推荐",
            reason: "攻速、暴击和远程伤害都有持续成长空间。",
          },
          {
            weaponId: "stick",
            priority: "经济替代",
            reason: "前期容易成型，把经济留给成长道具和防御。",
          },
        ],
        avoid:
          "无尽不要只堆单次伤害；第 20 波后敌人压力上升，清怪覆盖和生存更容易成为瓶颈。",
        keyItems: [
          {
            itemId: "coupon",
            priority: "核心",
            reason: "无尽更看重长期商店效率。",
          },
          {
            itemId: "potato",
            priority: "核心解锁",
            reason: "全属性成长对后续波次更耐用。",
          },
          {
            itemId: "powerGenerator",
            priority: "条件核心",
            reason: "当移速已经较高时，可把走位属性转化为输出。",
          },
        ],
        statPriority: {
          early: ["harvesting", "主伤害属性", "attackSpeed"],
          mid: ["armor", "maxHp", "speed", "luck"],
          late: ["critChance", "range", "dodge", "damagePercent"],
        },
        wave20Targets: {
          maxHp: [75, 100],
          armor: [10, 15],
          dodge: [25, 55],
          lifeSteal: [10, 18],
          damagePercent: [70, 120],
          attackSpeed: [60, 120],
          critChance: [35, 70],
          rangedDamage: [40, 70],
          meleeDamage: [40, 70],
          speed: [12, 25],
          harvesting: [80, 160],
          luck: [40, 100],
        },
        rhythm: [
          "第 20 波前保留成长空间，不要把所有钱砸在短期伤害。",
          "第 20 波后收获会转弱，提前把经济优势换成实际战斗属性。",
          "后期把移速、范围、护甲和闪避作为输出之外的硬需求。",
        ],
      },
    },
  },
  brawler: {
    id: "brawler",
    name: "Brawler",
    cnHint: "斗士，徒手近战",
    unlock: "默认 5 个角色之一，无需解锁。",
    summary:
      "适合徒手武器和高攻速近战。重点是贴脸输出时不被秒，所以生存阈值比纸面 DPS 更重要。",
    sourceNotes: defaultSourceNotes,
    plans: {
      normal20: {
        stance: "用 Fist 快速铺满 6 把，靠攻速、近战伤害和闪避打穿前中期。",
        recommendedWeapons: [
          {
            weaponId: "fist",
            priority: "主推荐",
            reason: "徒手标签契合角色，前期便宜，攻速堆起来后清怪顺滑。",
          },
          {
            weaponId: "hand",
            priority: "辅助",
            reason: "偏经济和控制，适合早期临时补材料，不建议全程纯 Hand。",
          },
          {
            weaponId: "powerFist",
            priority: "解锁后替代",
            reason: "Brawler 通关后解锁，后续近战上限更高。",
          },
        ],
        avoid: "慢速近战和远程路线都不优先；它们会浪费 Brawler 的徒手优势。",
        keyItems: [
          {
            itemId: "coffee",
            priority: "高",
            reason: "攻速直接提升贴脸输出和击退频率。",
          },
          {
            itemId: "wings",
            priority: "高",
            reason: "移速帮助选择接战角度，减少被围住的风险。",
          },
          {
            itemId: "whetstone",
            priority: "解锁后高",
            reason: "近战和回复属性都贴合 Brawler 的风险模型。",
          },
        ],
        statPriority: {
          early: ["meleeDamage", "attackSpeed", "dodge"],
          mid: ["armor", "maxHp", "lifeSteal", "speed"],
          late: ["damagePercent", "critChance", "range"],
        },
        wave20Targets: {
          maxHp: [65, 90],
          armor: [8, 13],
          dodge: [35, 60],
          lifeSteal: [8, 15],
          damagePercent: [35, 75],
          attackSpeed: [60, 120],
          critChance: [10, 35],
          meleeDamage: [35, 65],
          range: [20, 70],
          speed: [8, 18],
        },
        rhythm: [
          "第 1-5 波优先 6 把 Fist，合成可以慢一点，先保证攻击频率。",
          "第 6 波后每两三次购物至少补一次生存，贴脸角色不能只买输出。",
          "闪避接近上限前都很值，但护甲不能落下。",
        ],
      },
      endless: {
        stance: "无尽里徒手要同时补范围和防御，否则后期贴脸空间会越来越小。",
        recommendedWeapons: [
          {
            weaponId: "powerFist",
            priority: "解锁后主推荐",
            reason: "比 Fist 更适合后期输出阈值。",
          },
          {
            weaponId: "fist",
            priority: "开局",
            reason: "前期成型快，把钱留给成长和防御。",
          },
        ],
        avoid: "不要把移速降成负数；无尽后期需要主动脱离包围。",
        keyItems: [
          {
            itemId: "wings",
            priority: "核心",
            reason: "移速是无尽近战的防御属性。",
          },
          {
            itemId: "whetstone",
            priority: "解锁后核心",
            reason: "兼顾近战成长和续航。",
          },
          {
            itemId: "powerGenerator",
            priority: "条件核心",
            reason: "高移速路线可以把机动性转成伤害。",
          },
        ],
        statPriority: {
          early: ["meleeDamage", "attackSpeed", "harvesting"],
          mid: ["dodge", "armor", "maxHp", "speed"],
          late: ["range", "damagePercent", "critChance", "lifeSteal"],
        },
        wave20Targets: {
          maxHp: [85, 115],
          armor: [11, 16],
          dodge: [50, 60],
          lifeSteal: [12, 20],
          damagePercent: [60, 110],
          attackSpeed: [90, 160],
          critChance: [25, 55],
          meleeDamage: [55, 90],
          range: [60, 130],
          speed: [15, 30],
          harvesting: [60, 130],
        },
        rhythm: [
          "第 20 波前要把闪避、护甲和血量都拉到舒服区间。",
          "后期每次买负移速道具都要重新评估走位空间。",
          "输出足够时优先买范围和生存，别让近战命中窗口变窄。",
        ],
      },
    },
  },
  crazy: {
    id: "crazy",
    name: "Crazy",
    cnHint: "狂战士，暴击近战",
    unlock: "默认 5 个角色之一，无需解锁。",
    summary:
      "适合 Precise/暴击路线。强点是经济和暴击滚雪球，弱点是前期身板薄。",
    sourceNotes: defaultSourceNotes,
    plans: {
      normal20: {
        stance: "Knife 或 Thief Dagger 都可以，优先把暴击率转成经济和爆发。",
        recommendedWeapons: [
          {
            weaponId: "knife",
            priority: "主推荐",
            reason: "暴击倍率路线清晰，适合 Crazy 的定位。",
          },
          {
            weaponId: "thiefDagger",
            priority: "经济替代",
            reason: "如果前期刷到多把，可以用额外材料滚动商店。",
          },
        ],
        avoid: "不要太晚补生存；Crazy 的输出会骗人，让你误以为还能贪一波。",
        keyItems: [
          {
            itemId: "huntingTrophy",
            priority: "核心解锁",
            reason: "暴击击杀给经济，是 Crazy 路线最想解锁的长期组件。",
          },
          {
            itemId: "coffee",
            priority: "高",
            reason: "提高攻击频率，也提高暴击触发次数。",
          },
          {
            itemId: "wings",
            priority: "中",
            reason: "帮助近战角色控制接战距离。",
          },
        ],
        statPriority: {
          early: ["critChance", "meleeDamage", "attackSpeed"],
          mid: ["maxHp", "armor", "speed", "lifeSteal"],
          late: ["damagePercent", "dodge", "range"],
        },
        wave20Targets: {
          maxHp: [55, 75],
          armor: [6, 10],
          dodge: [15, 45],
          lifeSteal: [8, 14],
          damagePercent: [45, 90],
          attackSpeed: [45, 100],
          critChance: [50, 80],
          meleeDamage: [30, 60],
          speed: [8, 18],
          luck: [20, 70],
        },
        rhythm: [
          "前期看到暴击率和近战伤害都很香，但第 7 波前至少补一轮生命或护甲。",
          "解锁 Hunting Trophy 后，暴击率会同时影响输出和经济。",
          "如果 Thief Dagger 没成型，不要强行经济流，直接转 Knife 伤害。",
        ],
      },
      endless: {
        stance: "无尽更依赖暴击经济和可持续清怪，Hunting Trophy 解锁后价值明显提高。",
        recommendedWeapons: [
          {
            weaponId: "thiefDagger",
            priority: "经济主推荐",
            reason: "滚经济更适合无尽节奏。",
          },
          {
            weaponId: "knife",
            priority: "输出替代",
            reason: "当经济道具不足时，直接提高击杀能力。",
          },
        ],
        avoid: "不要只追 100% 暴击而忽略护甲和血量；无尽后期容错会快速下降。",
        keyItems: [
          {
            itemId: "huntingTrophy",
            priority: "核心解锁",
            reason: "暴击击杀经济是无尽滚雪球抓手。",
          },
          {
            itemId: "coupon",
            priority: "高",
            reason: "让经济优势更容易转成战斗属性。",
          },
          {
            itemId: "wings",
            priority: "高",
            reason: "近战无尽需要移动空间。",
          },
        ],
        statPriority: {
          early: ["critChance", "meleeDamage", "harvesting"],
          mid: ["attackSpeed", "armor", "maxHp", "speed"],
          late: ["damagePercent", "range", "dodge", "lifeSteal"],
        },
        wave20Targets: {
          maxHp: [70, 100],
          armor: [9, 14],
          dodge: [35, 60],
          lifeSteal: [12, 20],
          damagePercent: [70, 130],
          attackSpeed: [80, 150],
          critChance: [70, 100],
          meleeDamage: [50, 85],
          speed: [15, 28],
          harvesting: [80, 150],
          luck: [50, 120],
        },
        rhythm: [
          "先把暴击经济引擎搭起来，再把钱换成范围和防御。",
          "无尽第 20 波后不要继续迷信收获成长，及时买真实战斗属性。",
          "近战暴击后期需要足够范围，否则击杀效率会被走位拖慢。",
        ],
      },
    },
  },
  ranger: {
    id: "ranger",
    name: "Ranger",
    cnHint: "游侠，远程角色",
    unlock: "默认 5 个角色之一，无需解锁。",
    summary:
      "远程路线的标准模板。优先远程伤害、攻速和暴击，用距离换生存空间。",
    sourceNotes: defaultSourceNotes,
    plans: {
      normal20: {
        stance: "SMG 是最直接路线，Revolver 更偏单体，Pistol 可作为过渡。",
        recommendedWeapons: [
          {
            weaponId: "smg",
            priority: "主推荐",
            reason: "高频攻击让远程伤害、生命窃取和暴击都更稳定。",
          },
          {
            weaponId: "revolver",
            priority: "单体替代",
            reason: "更适合打精英和 Boss，但清怪压力要用攻速和范围补。",
          },
          {
            weaponId: "pistol",
            priority: "过渡",
            reason: "容易买到，前期可以先凑枪械数量。",
          },
        ],
        avoid: "不建议中途转近战；角色标签和初始优势都在远程。",
        keyItems: [
          {
            itemId: "nightGoggles",
            priority: "核心解锁",
            reason: "Ranger 通关后解锁，远程暴击路线非常契合。",
          },
          {
            itemId: "coffee",
            priority: "高",
            reason: "高频远程武器直接吃攻速收益。",
          },
          {
            itemId: "lemonade",
            priority: "中",
            reason: "用消耗品补回复，降低贴脸风险。",
          },
        ],
        statPriority: {
          early: ["rangedDamage", "attackSpeed", "damagePercent"],
          mid: ["lifeSteal", "range", "armor", "maxHp"],
          late: ["critChance", "speed", "luck"],
        },
        wave20Targets: {
          maxHp: [50, 75],
          armor: [6, 10],
          dodge: [0, 30],
          lifeSteal: [8, 16],
          damagePercent: [45, 90],
          attackSpeed: [60, 120],
          critChance: [25, 60],
          rangedDamage: [35, 65],
          range: [80, 180],
          speed: [5, 15],
        },
        rhythm: [
          "前 5 波尽量凑枪械数量，别急着把钱花在泛用小道具上。",
          "SMG 路线生命窃取很值，Revolver 路线则更需要单次伤害和暴击。",
          "第 13 波后补护甲和血量，避免远程角色被冲脸秒掉。",
        ],
      },
      endless: {
        stance: "远程无尽要让屏幕覆盖、生命窃取和暴击经济一起成长。",
        recommendedWeapons: [
          {
            weaponId: "smg",
            priority: "主推荐",
            reason: "高频命中更适合无尽的生命窃取、暴击和范围覆盖。",
          },
          {
            weaponId: "revolver",
            priority: "精英替代",
            reason: "单体强，但要额外补清怪能力。",
          },
        ],
        avoid: "不要把范围和移速当作可有可无；后期它们会决定能不能稳定输出。",
        keyItems: [
          {
            itemId: "nightGoggles",
            priority: "核心解锁",
            reason: "暴击和范围路线的关键补强。",
          },
          {
            itemId: "huntingTrophy",
            priority: "条件核心",
            reason: "暴击率足够时，击杀经济会放大无尽收益。",
          },
          {
            itemId: "coupon",
            priority: "高",
            reason: "长期购物效率对无尽更值钱。",
          },
        ],
        statPriority: {
          early: ["rangedDamage", "attackSpeed", "harvesting"],
          mid: ["lifeSteal", "range", "armor", "speed"],
          late: ["critChance", "damagePercent", "maxHp", "luck"],
        },
        wave20Targets: {
          maxHp: [65, 95],
          armor: [9, 14],
          dodge: [20, 50],
          lifeSteal: [12, 22],
          damagePercent: [70, 130],
          attackSpeed: [100, 180],
          critChance: [50, 85],
          rangedDamage: [55, 90],
          range: [150, 300],
          speed: [12, 25],
          harvesting: [70, 150],
          luck: [40, 100],
        },
        rhythm: [
          "第 20 波前把生命窃取和范围做起来，让高频武器不只会打纸面 DPS。",
          "后期商店里远程伤害、攻速、暴击都要，但缺防御时先买防御。",
          "无尽第 20 波后经济规则变差，别把胜负押在收获自然增长上。",
        ],
      },
    },
  },
  mage: {
    id: "mage",
    name: "Mage",
    cnHint: "法师，元素燃烧",
    unlock: "默认 5 个角色之一，无需解锁。",
    summary:
      "元素路线核心是点燃、传播和范围清怪。伤害面板不一定立刻好看，但清场质量很重要。",
    sourceNotes: defaultSourceNotes,
    plans: {
      normal20: {
        stance: "Wand 开局最稳，尽快拿到点燃和传播相关道具。",
        recommendedWeapons: [
          {
            weaponId: "wand",
            priority: "主推荐",
            reason: "元素缩放明确，能稳定触发燃烧路线。",
          },
          {
            weaponId: "taser",
            priority: "控制替代",
            reason: "降低怪物压力，但要额外补伤害。",
          },
          {
            weaponId: "torch",
            priority: "近战替代",
            reason: "元素近战能打，但更考验走位和生存。",
          },
          {
            weaponId: "thunderSword",
            priority: "通关后可选",
            reason: "Mage 通关后解锁，适合后续尝试元素近战上限。",
          },
        ],
        avoid: "不要只堆总伤害而忽略元素伤害；燃烧路线需要基础元素数值。",
        keyItems: [
          {
            itemId: "scaredSausage",
            priority: "核心",
            reason: "提供点燃入口，是元素燃烧路线的关键。",
          },
          {
            itemId: "snake",
            priority: "核心",
            reason: "传播燃烧，显著改善清怪。",
          },
          {
            itemId: "coffee",
            priority: "高",
            reason: "提高触发频率，让点燃和控制更稳定。",
          },
        ],
        statPriority: {
          early: ["elementalDamage", "attackSpeed", "damagePercent"],
          mid: ["range", "speed", "maxHp", "armor"],
          late: ["critChance", "dodge", "luck"],
        },
        wave20Targets: {
          maxHp: [50, 75],
          armor: [6, 10],
          dodge: [10, 35],
          hpRegen: [6, 12],
          damagePercent: [35, 75],
          attackSpeed: [35, 80],
          elementalDamage: [35, 70],
          range: [80, 200],
          speed: [6, 16],
          luck: [20, 70],
        },
        rhythm: [
          "前期先保证有足够武器命中来触发燃烧。",
          "看到 Scared Sausage 和 Snake 要高度重视，它们改变的是清怪形态。",
          "元素伤害够后再补总伤害和暴击，不要顺序反了。",
        ],
      },
      endless: {
        stance: "无尽元素要扩大燃烧覆盖，同时把后期生存补到可持续走位。",
        recommendedWeapons: [
          {
            weaponId: "wand",
            priority: "主推荐",
            reason: "安全、稳定，适合作为元素无尽底座。",
          },
          {
            weaponId: "thunderSword",
            priority: "解锁后替代",
            reason: "有更高后期上限，但要补足生存和范围。",
          },
        ],
        avoid: "无尽不要依赖单点燃烧；没有传播和范围时会被怪潮压住。",
        keyItems: [
          {
            itemId: "scaredSausage",
            priority: "核心",
            reason: "没有点燃入口，元素燃烧路线会断档。",
          },
          {
            itemId: "snake",
            priority: "核心",
            reason: "传播决定无尽清怪覆盖。",
          },
          {
            itemId: "powerGenerator",
            priority: "条件核心",
            reason: "元素远程通常需要移速走位，高移速可额外转输出。",
          },
        ],
        statPriority: {
          early: ["elementalDamage", "harvesting", "attackSpeed"],
          mid: ["range", "speed", "armor", "maxHp"],
          late: ["damagePercent", "dodge", "luck", "hpRegen"],
        },
        wave20Targets: {
          maxHp: [65, 95],
          armor: [9, 14],
          dodge: [25, 55],
          hpRegen: [10, 18],
          damagePercent: [60, 110],
          attackSpeed: [60, 120],
          elementalDamage: [60, 100],
          range: [160, 320],
          speed: [14, 28],
          harvesting: [70, 140],
          luck: [50, 120],
        },
        rhythm: [
          "第 20 波前点燃和传播要成型，否则无尽开始后清怪会断。",
          "优先让元素伤害跨过清怪阈值，再追总伤害。",
          "后期用范围和移速保证燃烧覆盖，不要站桩等怪贴脸。",
        ],
      },
    },
  },
  engineer: {
    id: "engineer",
    name: "Engineer",
    cnHint: "工程师，工程结构",
    unlock: "同时让地图上存在 5 个炮塔后解锁。",
    summary:
      "工程学角色的重点是结构物输出。总伤害和攻速通常不能直接放大炮塔，路线要单独看。",
    sourceNotes: defaultSourceNotes,
    plans: {
      normal20: {
        stance: "Wrench 最稳，围绕炮塔数量和工程学成长打通 20 波。",
        recommendedWeapons: [
          {
            weaponId: "wrench",
            priority: "主推荐",
            reason: "炮塔输出稳定，最契合 Engineer。",
          },
          {
            weaponId: "screwdriver",
            priority: "替代",
            reason: "地雷路线也吃工程学，但节奏和站位更挑。",
          },
        ],
        avoid: "不要用普通武器思维堆总伤害和攻速；先确认属性是否影响结构物。",
        keyItems: [
          {
            itemId: "turret",
            priority: "核心",
            reason: "更多结构物就是更稳定的清怪和 Boss 压力。",
          },
          {
            itemId: "robotArm",
            priority: "核心解锁",
            reason: "Engineer 通关后解锁，直接补工程学路线。",
          },
          {
            itemId: "coupon",
            priority: "中",
            reason: "工程流需要买结构和升级，折扣能缓解经济压力。",
          },
        ],
        statPriority: {
          early: ["engineering", "armor", "maxHp"],
          mid: ["speed", "hpRegen", "luck", "harvesting"],
          late: ["dodge", "range"],
        },
        wave20Targets: {
          maxHp: [60, 85],
          armor: [8, 13],
          dodge: [10, 40],
          hpRegen: [8, 16],
          engineering: [45, 80],
          speed: [5, 15],
          harvesting: [40, 90],
          luck: [20, 80],
        },
        rhythm: [
          "前期优先同类 Wrench 和工程学，别被普通伤害道具带偏。",
          "中期补移速和护甲，让自己能把怪带进炮塔火力圈。",
          "看到结构物相关道具要重视，但别牺牲基础生存。",
        ],
      },
      endless: {
        stance: "无尽工程要靠结构密度、工程学和走位生存，不能只靠前期炮塔。",
        recommendedWeapons: [
          {
            weaponId: "wrench",
            priority: "主推荐",
            reason: "结构密度高，路线最清晰。",
          },
          {
            weaponId: "screwdriver",
            priority: "补充",
            reason: "地雷能补爆发，但需要更强走位规划。",
          },
        ],
        avoid: "不要买太多不影响结构物的输出道具，除非它们同时给生存或经济。",
        keyItems: [
          {
            itemId: "robotArm",
            priority: "核心解锁",
            reason: "工程学成长越到后面越关键。",
          },
          {
            itemId: "turret",
            priority: "核心",
            reason: "无尽需要持续扩大结构火力密度。",
          },
          {
            itemId: "coupon",
            priority: "高",
            reason: "长期购物效率能补足结构流的资金压力。",
          },
        ],
        statPriority: {
          early: ["engineering", "harvesting", "armor"],
          mid: ["maxHp", "hpRegen", "speed", "luck"],
          late: ["dodge", "range", "lifeSteal"],
        },
        wave20Targets: {
          maxHp: [80, 115],
          armor: [12, 18],
          dodge: [30, 60],
          hpRegen: [14, 24],
          engineering: [75, 125],
          speed: [12, 25],
          harvesting: [80, 160],
          luck: [60, 130],
        },
        rhythm: [
          "第 20 波前工程学要足够高，不然无尽开始后结构输出会掉队。",
          "把走位路线设计成绕结构火力圈，而不是到处乱跑。",
          "后期生存优先级很高，因为结构物输出需要你活着拖时间。",
        ],
      },
    },
  },
  lucky: {
    id: "lucky",
    name: "Lucky",
    cnHint: "幸运星，拾取触发流派",
    unlock: "收集 300 材料后解锁。",
    summary:
      "Lucky 的强点是高幸运、消耗品/材料掉落和拾取触发伤害。普通通关重视清怪稳定性，无尽则更看重幸运、拾取频率和触发类道具的滚雪球。",
    sourceNotes: [
      ...defaultSourceNotes,
      "Brotato Wiki: Lucky 页确认角色解锁、起始武器、幸运相关加成和 Lucky Charm 解锁。",
    ],
    plans: {
      normal20: {
        stance:
          "Slingshot 是最顺手的 Lucky 路线：弹射吃敌人密度，高幸运又能放大赛博球和象宝宝这类拾取触发道具。",
        recommendedWeapons: [
          {
            weaponId: "lute",
            priority: "强力推荐",
            reason: "琉特琴和 Lucky 的幸运路线天然契合，适合作为高幸运流派的核心武器选择。",
          },
          {
            weaponId: "slingshot",
            priority: "主推荐",
            reason: "弹射清怪稳定，和 Lucky 的高幸运/高掉落节奏配合最好。",
          },
          {
            weaponId: "pruner",
            priority: "经济替代",
            reason: "偏收获和续航，可以把 Lucky 的掉落优势进一步滚起来。",
          },
          {
            weaponId: "rock",
            priority: "稳健替代",
            reason: "提供更舒服的前期生存，但清怪上限不如 Slingshot 直接。",
          },
        ],
        avoid:
          "不要只堆幸运而忽略主武器伤害；Lucky 的触发伤害需要清怪和拾取节奏支撑。",
        keyItems: [
          {
            itemId: "cyberball",
            priority: "核心",
            reason: "拾取触发且随幸运成长，是 Lucky 最容易放大的输出来源。",
          },
          {
            itemId: "babyElephant",
            priority: "高",
            reason: "同样吃拾取节奏，和 Cyberball 叠起来能明显改善清怪。",
          },
          {
            itemId: "babyWithABeard",
            priority: "高",
            reason: "清怪越顺，击杀触发越频繁，能把 Lucky 的高密度清场节奏继续放大。",
          },
          {
            itemId: "babyGecko",
            priority: "高",
            reason: "扩大材料和消耗品拾取效率，能让 Lucky 更稳定地触发拾取伤害。",
          },
          {
            itemId: "sifdsRelic",
            priority: "高",
            reason: "全屏拾取会显著提高触发频率，特别适合 Lucky 的材料/消耗品循环。",
          },
          {
            itemId: "luckyCharm",
            priority: "核心解锁",
            reason: "Lucky 通关后解锁，后续幸运路线更容易成型。",
          },
        ],
        statPriority: {
          early: ["luck", "damagePercent", "attackSpeed"],
          mid: ["harvesting", "maxHp", "armor", "speed"],
          late: ["rangedDamage", "dodge", "lifeSteal 或 hpRegen"],
        },
        wave20Targets: {
          maxHp: [55, 80],
          armor: [6, 11],
          dodge: [15, 45],
          hpRegen: [6, 14],
          lifeSteal: [4, 10],
          damagePercent: [55, 100],
          attackSpeed: [35, 85],
          rangedDamage: [15, 40],
          speed: [8, 18],
          harvesting: [50, 110],
          luck: [180, 320],
        },
        rhythm: [
          "前 5 波优先凑 Slingshot 数量，保证清怪后才有拾取触发节奏。",
          "看到 Cyberball 和 Baby Elephant 可以高优先级锁，Lucky 的幸运会放大它们。",
          "第 10 波后如果清怪已经顺，开始补血量、护甲和移速，别被高掉落诱惑到太贪。",
        ],
      },
      endless: {
        stance:
          "无尽 Lucky 更适合走高幸运 + 高拾取频率 + 弹射清怪的路线，Cyberball 这类道具在高密度场景会更亮。",
        recommendedWeapons: [
          {
            weaponId: "lute",
            priority: "主推荐",
            reason: "无尽更容易堆高幸运，琉特琴这类幸运武器更适合吃长期成长。",
          },
          {
            weaponId: "slingshot",
            priority: "稳定替代",
            reason: "高密度无尽下弹射目标更充足，清怪和拾取循环更顺。",
          },
          {
            weaponId: "pruner",
            priority: "成长替代",
            reason: "适合把经济和回复滚起来，但需要额外补输出。",
          },
        ],
        avoid:
          "无尽不要把幸运当成唯一输出；第 20 波后仍要把远程伤害、攻速和生存补到位。",
        keyItems: [
          {
            itemId: "cyberball",
            priority: "核心",
            reason: "高幸运和高拾取频率会把触发伤害推高，尤其适合高密度场景。",
          },
          {
            itemId: "babyElephant",
            priority: "核心",
            reason: "与 Cyberball 同方向叠加，增强拾取触发的随机目标伤害。",
          },
          {
            itemId: "babyWithABeard",
            priority: "核心",
            reason: "击杀触发在高密度无尽里更容易连起来，适合 Lucky 的清场和掉落循环。",
          },
          {
            itemId: "babyGecko",
            priority: "核心",
            reason: "让材料和消耗品更容易被连续吸入，直接提高 Lucky 拾取触发的稳定性。",
          },
          {
            itemId: "sifdsRelic",
            priority: "核心",
            reason: "全屏拾取能把高掉落转化为更高触发频率，是无尽 Lucky 的重要滚雪球组件。",
          },
          {
            itemId: "luckyCharm",
            priority: "核心解锁",
            reason: "通关 Lucky 后解锁，是幸运路线的后续核心组件。",
          },
        ],
        statPriority: {
          early: ["luck", "damagePercent", "harvesting"],
          mid: ["attackSpeed", "speed", "armor", "maxHp"],
          late: ["rangedDamage", "dodge", "hpRegen", "range"],
        },
        wave20Targets: {
          maxHp: [70, 105],
          armor: [9, 15],
          dodge: [35, 60],
          hpRegen: [10, 20],
          lifeSteal: [6, 14],
          damagePercent: [90, 160],
          attackSpeed: [70, 140],
          rangedDamage: [25, 60],
          range: [80, 180],
          speed: [15, 30],
          harvesting: [100, 200],
          luck: [300, 550],
        },
        rhythm: [
          "第 20 波前保证清怪和拾取链路，不要只靠 Cyberball 随机补伤害。",
          "无尽高密度下优先买能增加拾取、幸运、总伤害和范围清怪的组合。",
          "幸运触发收益会很好看，但后期生存阈值同样硬，护甲、闪避和移速不能断档。",
        ],
      },
    },
  },
  chunky: {
    id: "chunky",
    name: "Chunky",
    cnHint: "大壮，生命坦克",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "大壮适合把最大生命和生存转化成容错，用偏稳定的近战或弹射路线通关。伤害不能断档，否则只肉不清怪。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "先用 Rock 或 Spear 建立稳定清怪，再用最大生命、护甲和回复撑容错。",
      weapons: ["rock", "spear", "stick"],
      avoid: "不要只堆最大生命；没有足够攻速和伤害时会被后期怪潮拖死。",
      items: ["wings", "whetstone", "potato"],
      statPriority: {
        early: ["maxHp", "meleeDamage", "attackSpeed"],
        mid: ["armor", "hpRegen", "damagePercent", "speed"],
        late: ["dodge", "luck", "range"],
      },
      targets: {
        maxHp: [90, 130],
        armor: [8, 14],
        dodge: [10, 35],
        hpRegen: [10, 20],
        damagePercent: [35, 80],
        attackSpeed: [25, 70],
        meleeDamage: [30, 60],
        speed: [0, 12],
        luck: [20, 70],
      },
      rhythm: [
        "前 5 波不要过度贪血量，先把同类武器数量补齐。",
        "中期血量足够后补护甲和回复，避免高血量被连续消耗。",
        "第 15 波后补移速和清怪，防止被高密度怪潮卡住。",
      ],
    }),
  },
  old: {
    id: "old",
    name: "Old",
    cnHint: "老叟，低速高经验",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "老叟地图小、节奏紧，适合近距离覆盖和高效率清怪。移速短板明显，需要更早补走位属性。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 SMG 或 Slingshot 处理小地图密度，优先让武器数量和攻速成型。",
      weapons: ["smg", "slingshot", "wand"],
      avoid: "不要选择需要大范围拉扯的慢速武器；老叟更怕走位空间不足。",
      items: ["coffee", "wings", "coupon"],
      statPriority: {
        early: ["attackSpeed", "damagePercent", "rangedDamage"],
        mid: ["speed", "armor", "maxHp", "lifeSteal"],
        late: ["range", "dodge", "luck"],
      },
      targets: {
        maxHp: [55, 80],
        armor: [7, 12],
        dodge: [15, 45],
        lifeSteal: [6, 14],
        damagePercent: [45, 90],
        attackSpeed: [60, 120],
        rangedDamage: [25, 55],
        range: [60, 140],
        speed: [10, 22],
      },
      rhythm: [
        "前期小地图收益高，先把清怪节奏拉起来。",
        "第 8 波后优先补移速和生存，避免被小地图包围。",
        "后期范围和攻速继续提高，减少怪贴脸时间。",
      ],
    }),
  },
  loud: {
    id: "loud",
    name: "Loud",
    cnHint: "大嗓门，高密度清怪",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "大嗓门面对更多敌人，收益来自高密度清怪和击杀经济。武器要能覆盖多个目标，单体慢武器压力很大。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 Slingshot、SMG 或 Spear 吃高密度收益，先解决清怪覆盖。",
      weapons: ["slingshot", "smg", "spear"],
      avoid: "不要过早拿只提升单体爆发的路线；大嗓门先看清场效率。",
      items: ["babyWithABeard", "coupon", "coffee"],
      statPriority: {
        early: ["attackSpeed", "damagePercent", "rangedDamage"],
        mid: ["armor", "maxHp", "lifeSteal", "speed"],
        late: ["range", "critChance", "luck"],
      },
      targets: {
        maxHp: [60, 85],
        armor: [8, 13],
        dodge: [10, 35],
        lifeSteal: [8, 16],
        damagePercent: [55, 105],
        attackSpeed: [60, 130],
        rangedDamage: [30, 65],
        meleeDamage: [20, 50],
        range: [70, 160],
        speed: [8, 18],
      },
      rhythm: [
        "前 5 波以武器数量和攻速为核心。",
        "中期优先补吸血或回复，因为敌人多意味着失误频率更高。",
        "后期范围、穿透、弹射类收益优先级提高。",
      ],
    }),
  },
  multitasker: {
    id: "multitasker",
    name: "Multitasker",
    cnHint: "多面手，多武器数量",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "多面手能带更多武器，最怕路线散。应选择便宜、同类、能被数量放大的武器，把规模优势转成稳定 DPS。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "优先 Stick 或 SMG 这类容易复制的武器，靠数量堆出基础火力。",
      weapons: ["stick", "smg", "screwdriver"],
      avoid: "不要混太多缩放类型；武器多不等于路线可以乱。",
      items: ["coffee", "coupon", "potato"],
      statPriority: {
        early: ["attackSpeed", "damagePercent", "主伤害属性"],
        mid: ["armor", "maxHp", "lifeSteal 或 hpRegen", "harvesting"],
        late: ["critChance", "range", "luck"],
      },
      targets: {
        maxHp: [60, 85],
        armor: [7, 12],
        dodge: [10, 35],
        lifeSteal: [6, 14],
        hpRegen: [6, 14],
        damagePercent: [45, 95],
        attackSpeed: [50, 110],
        rangedDamage: [25, 55],
        meleeDamage: [25, 55],
        harvesting: [40, 100],
      },
      rhythm: [
        "前期尽量只买同类武器，不要被便宜杂牌分散缩放。",
        "武器格子变多后，升级和合成节奏要更克制。",
        "第 12 波后把数量优势转成生存和范围覆盖。",
      ],
    }),
  },
  wildling: {
    id: "wildling",
    name: "Wildling",
    cnHint: "野人，原始武器",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "野人适合 Primitive 武器，前期便宜且容易成型。中后期要补伤害倍率，否则基础武器会掉队。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 Stick、Slingshot 或 Rock 快速凑满原始武器，先拿前期经济和数量优势。",
      weapons: ["stick", "slingshot", "rock"],
      avoid: "不要在前期转去高价稀有武器，野人强在低成本成型。",
      items: ["coffee", "whetstone", "babyGecko"],
      statPriority: {
        early: ["attackSpeed", "meleeDamage", "rangedDamage"],
        mid: ["damagePercent", "armor", "maxHp", "speed"],
        late: ["critChance", "dodge", "luck"],
      },
      targets: {
        maxHp: [60, 85],
        armor: [7, 12],
        dodge: [15, 45],
        damagePercent: [45, 90],
        attackSpeed: [50, 110],
        meleeDamage: [30, 65],
        rangedDamage: [25, 55],
        speed: [8, 18],
        luck: [40, 100],
      },
      rhythm: [
        "前 5 波把原始武器数量铺起来。",
        "中期开始补总伤害和生存，别停留在前期便宜优势。",
        "后期看当前主武器决定近战或远程缩放，避免双线都不够。",
      ],
    }),
  },
  pacifist: {
    id: "pacifist",
    name: "Pacifist",
    cnHint: "和平主义者，生存经济",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "和平主义者不靠击杀收益，重点是活着、拾取和收获。输出只需要够推开压力，生存和经济是主线。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 Hand 或 Pruner 建立经济和续航，优先把生存阈值堆到安全。",
      weapons: ["hand", "pruner", "taser"],
      avoid: "不要用纯输出思路硬追击杀；和平主义者更需要稳定绕场和资源回收。",
      items: ["wings", "babyGecko", "coupon"],
      statPriority: {
        early: ["harvesting", "speed", "maxHp"],
        mid: ["armor", "dodge", "hpRegen", "luck"],
        late: ["range", "damagePercent", "attackSpeed"],
      },
      targets: {
        maxHp: [70, 100],
        armor: [9, 15],
        dodge: [35, 60],
        hpRegen: [12, 24],
        damagePercent: [10, 45],
        attackSpeed: [20, 60],
        speed: [15, 30],
        harvesting: [100, 200],
        luck: [60, 140],
      },
      rhythm: [
        "前期优先经济和移速，目标是稳稳活到奖励结算。",
        "中期把护甲、闪避和回复补到位，避免被精英波打穿。",
        "后期输出只补够控场，不要牺牲核心生存。",
      ],
    }),
  },
  gladiator: {
    id: "gladiator",
    name: "Gladiator",
    cnHint: "角斗士，多近战武器",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "角斗士适合多种近战武器并行，但缩放仍要集中在近战伤害、攻速和生存。贴脸风险高，护甲不能落后。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 Knife、Spear、Fist 等近战组合建立清怪覆盖，靠近战伤害和攻速放大。",
      weapons: ["knife", "spear", "fist"],
      avoid: "不要转远程或工程；角色优势在近战武器池。",
      items: ["whetstone", "coffee", "wings"],
      statPriority: {
        early: ["meleeDamage", "attackSpeed", "critChance"],
        mid: ["armor", "maxHp", "lifeSteal", "speed"],
        late: ["damagePercent", "dodge", "range"],
      },
      targets: {
        maxHp: [65, 95],
        armor: [8, 14],
        dodge: [20, 50],
        lifeSteal: [8, 16],
        damagePercent: [40, 85],
        attackSpeed: [55, 120],
        critChance: [25, 60],
        meleeDamage: [40, 80],
        range: [20, 80],
        speed: [10, 22],
      },
      rhythm: [
        "前期只拿近战武器，保持角色优势。",
        "中期补护甲和吸血，确保贴脸输出不暴毙。",
        "后期暴击和范围能显著提升近战清怪手感。",
      ],
    }),
  },
  saver: {
    id: "saver",
    name: "Saver",
    cnHint: "节俭者，存钱成长",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "节俭者需要在存钱收益和战斗阈值之间平衡。前期不能太贪，清怪稳定后再让经济滚起来。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用便宜稳定的 SMG 或 Stick 成型，少刷新，把钱留给关键阈值。",
      weapons: ["smg", "stick", "slingshot"],
      avoid: "不要每波把钱花光；但也不能为了存钱导致武器数量落后。",
      items: ["coupon", "coffee", "potato"],
      statPriority: {
        early: ["harvesting", "attackSpeed", "主伤害属性"],
        mid: ["damagePercent", "armor", "maxHp", "speed"],
        late: ["critChance", "dodge", "luck"],
      },
      targets: {
        maxHp: [55, 80],
        armor: [7, 12],
        dodge: [10, 35],
        damagePercent: [45, 90],
        attackSpeed: [45, 100],
        rangedDamage: [25, 55],
        meleeDamage: [25, 55],
        speed: [5, 16],
        harvesting: [60, 130],
        luck: [30, 90],
      },
      rhythm: [
        "前 5 波仍要买武器，别为了存钱放弃清怪。",
        "中期只买能跨过阈值的道具，少做小额无效消费。",
        "后期把存钱收益换成护甲、闪避和核心输出。",
      ],
    }),
  },
  sick: {
    id: "sick",
    name: "Sick",
    cnHint: "病人，生命窃取",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "病人适合高攻速和生命窃取路线。持续掉血要求武器尽快形成高频命中，回复和清怪都不能断。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 SMG 或 Fist 提供高频命中，让生命窃取稳定覆盖持续掉血。",
      weapons: ["smg", "fist", "knife"],
      avoid: "不要用低频慢武器开局；命中少会让生命窃取不稳定。",
      items: ["coffee", "whetstone", "wings"],
      statPriority: {
        early: ["attackSpeed", "lifeSteal", "damagePercent"],
        mid: ["maxHp", "armor", "rangedDamage", "meleeDamage"],
        late: ["dodge", "critChance", "speed"],
      },
      targets: {
        maxHp: [65, 95],
        armor: [8, 14],
        dodge: [15, 45],
        lifeSteal: [15, 25],
        damagePercent: [45, 95],
        attackSpeed: [70, 140],
        rangedDamage: [25, 60],
        meleeDamage: [25, 60],
        speed: [8, 18],
      },
      rhythm: [
        "前期优先生命窃取和攻速，先覆盖持续掉血压力。",
        "中期补最大生命和护甲，提高失误容错。",
        "后期输出和回复一起补，不要只看纸面 DPS。",
      ],
    }),
  },
  farmer: {
    id: "farmer",
    name: "Farmer",
    cnHint: "农夫，收获经济",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "农夫依赖收获和经济滚雪球。前中期可以更重视收获，但清怪底线必须守住。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 Pruner 或 Slingshot 兼顾经济和清怪，先把收获滚起来。",
      weapons: ["pruner", "slingshot", "taser"],
      avoid: "不要为了收获完全放弃输出；第 12 波后清怪不足会很快崩盘。",
      items: ["coupon", "babyGecko", "sifdsRelic"],
      statPriority: {
        early: ["harvesting", "luck", "attackSpeed"],
        mid: ["damagePercent", "armor", "maxHp", "speed"],
        late: ["rangedDamage", "dodge", "range"],
      },
      targets: {
        maxHp: [55, 80],
        armor: [7, 12],
        dodge: [10, 35],
        damagePercent: [35, 80],
        attackSpeed: [35, 90],
        rangedDamage: [20, 50],
        speed: [8, 18],
        harvesting: [140, 260],
        luck: [70, 160],
      },
      rhythm: [
        "前期看到收获和经济道具可以更积极，但至少保持武器数量。",
        "中期开始把经济换成伤害和护甲。",
        "后期收获边际下降，优先买能直接提高清怪和生存的东西。",
      ],
    }),
  },
  ghost: {
    id: "ghost",
    name: "Ghost",
    cnHint: "幽灵，闪避玻璃炮",
    unlock: "待校验：已确认官方中文名，具体解锁条件待补。",
    summary:
      "幽灵适合高闪避和幽灵武器思路，但容错很薄。这里先用 Knife/Spear 近战模板，重点是闪避上限和别被一击带走。",
    sourceNotes: defaultSourceNotes,
    plans: makeSeedPlans({
      normalStance: "用 Knife 或 Spear 快速形成近战输出，同时尽早把闪避和移速补到舒服区间。",
      weapons: ["knife", "spear", "fist"],
      avoid: "不要拿太多降低护甲容错的道具；幽灵已经很怕连续失误。",
      items: ["wings", "coffee", "whetstone"],
      statPriority: {
        early: ["dodge", "attackSpeed", "meleeDamage"],
        mid: ["damagePercent", "maxHp", "speed", "lifeSteal"],
        late: ["critChance", "range", "luck"],
      },
      targets: {
        maxHp: [45, 70],
        armor: [0, 5],
        dodge: [55, 60],
        lifeSteal: [6, 14],
        damagePercent: [55, 105],
        attackSpeed: [60, 130],
        critChance: [30, 70],
        meleeDamage: [35, 75],
        speed: [15, 30],
      },
      rhythm: [
        "前期优先闪避和武器数量，尽快减少被蹭死的概率。",
        "中期补最大生命，避免闪避失败时被秒。",
        "后期把暴击和攻速拉高，用更短战斗时间降低风险。",
      ],
    }),
  },
};
