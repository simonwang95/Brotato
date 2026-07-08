import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";

const defaultInstallDir =
  "***REMOVED***/Library/Application Support/Steam/steamapps/common/Brotato";

const installDir = process.env.BROTATO_INSTALL_DIR || defaultInstallDir;
const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const outputPath = process.env.BROTATO_LOCALIZATION_OUTPUT || "data/official-localization.json";

const packageInputs = [
  {
    id: "base",
    path: join(installDir, "Brotato.app/Contents/Resources/Brotato.pck"),
  },
  {
    id: "abyssalTerrors",
    path: join(installDir, "BrotatoAbyssalTerrors.pck"),
  },
];

const ENGLISH_NAME_OVERRIDES = {
  ITEM_ESTYS_COUCH: "Esty’s Couch",
  ITEM_GRINDS_MAGICAL_LEAF: "Grind’s Magical Leaf",
  ITEM_KRAKENS_EYE: "Kraken’s Eye",
  ITEM_RETROMATIONS_HOODIE: "Retromation’s Hoodie",
  ITEM_SIFDS_RELIC: "Sifd’s Relic",
  WEAPON_CAPTAINS_SWORD: "Captain’s Sword",
  WEAPON_DAGGER: "Thief Dagger",
  WEAPON_DEXTROYER: "Dextroyer",
};

const CHINESE_NAME_OVERRIDES = {
  ITEM_BABY_ELEPHANT: "象宝宝",
  ITEM_BABY_WITH_A_BEARD: "长胡子的婴儿",
  ITEM_ADRENALINE: "肾上腺素",
  ITEM_ALIEN_BABY: "幼年异形",
  ITEM_ALIEN_EYES: "异形眼球",
  ITEM_ALIEN_MAGIC: "外星魔法",
  ITEM_ALIEN_TONGUE: "异形之舌",
  ITEM_ALIEN_WORM: "异形虫",
  ITEM_BALL_AND_CHAIN: "链球",
  ITEM_BANDANA: "头巾",
  ITEM_BARNACLE: "藤壶",
  ITEM_BARRICADE: "路障",
  ITEM_BEAN_TEACHER: "豆老师",
  ITEM_BLAZEMANDER: "焰蜥蜴",
  ITEM_BLINDFOLD: "眼罩",
  ITEM_BLOOD_DONATION: "献血",
  ITEM_BOILING_WATER: "沸水",
  ITEM_BOT_O_MINE: "地雷机器人",
  ITEM_BROKEN_HOURGLASS: "破损沙漏",
  ITEM_BROKEN_MOUTH: "破嘴",
  ITEM_BUILDER_TURRET: "建造者的炮塔",
  ITEM_BUTTERFLY: "蝴蝶",
  ITEM_CANDLE: "蜡烛",
  ITEM_CATLING_GUN: "双枪猫",
  ITEM_CELERY_TEA: "芹菜茶",
  ITEM_CHAMELEON: "变色龙",
  ITEM_CHARCOAL: "木炭",
  ITEM_COMMUNITY_SUPPORT: "社区支持",
  ITEM_COMPASS: "指南针",
  ITEM_CORRUPTED_SHARD: "被腐蚀的碎片",
  ITEM_CYBERBALL: "赛博球",
  ITEM_DANGEROUS_BUNNY: "危险的兔子",
  ITEM_DEFECTIVE_STEROIDS: "有缺陷的增强剂",
  ITEM_DECOMPOSING_FLESH: "腐肉",
  ITEM_ENERGY_BRACELET: "能量手环",
  ITEM_EVIL_HAT: "邪恶帽子",
  ITEM_EYES_SURGERY: "眼部手术",
  ITEM_FERTILIZER: "肥料",
  ITEM_EXPLOSIVE_SHELLS: "爆裂弹",
  ITEM_EXTRA_STOMACH: "另一个胃",
  ITEM_FEATHER: "羽毛",
  ITEM_FRIED_RICE: "炒饭",
  ITEM_FROZEN_HEART: "冰冷之心",
  ITEM_GENTLE_ALIEN: "外星绅士",
  ITEM_GHOST_OUTFIT: "幽灵服",
  ITEM_GLASS_CANNON: "玻璃大炮",
  ITEM_GLASSES: "眼镜",
  ITEM_GOLDFISH_USED: "休息的金鱼",
  ITEM_GRINDS_MAGICAL_LEAF: "Grind的魔法绿叶",
  ITEM_HEDGEHOG: "刺猬",
  ITEM_HOURGLASS: "沙漏",
  ITEM_HUNTING_TROPHY: "狩猎战利品",
  ITEM_IMPROVED_TOOLS: "改进工具",
  ITEM_INSANITY: "疯狂",
  ITEM_JELLYSHIELD: "水母盾",
  ITEM_JETPACK: "喷气背包",
  ITEM_LANDMINES: "地雷",
  ITEM_LANTERN: "灯笼",
  ITEM_LEATHER_VEST: "皮革背心",
  ITEM_LIGHTHOUSE: "灯塔",
  ITEM_LITTLE_MUSCLEY_DUDE: "肌肉小子",
  ITEM_LUCKY_CHARM: "护身符",
  ITEM_LUCKY_COIN: "幸运硬币",
  ITEM_LUMBERJACK_SHIRT: "伐木工人衬衫",
  ITEM_MASTERY: "精通",
  ITEM_METAL_DETECTOR: "金属探测器",
  ITEM_METAL_PLATE: "金属板",
  ITEM_MISSILE: "导弹",
  ITEM_MUSHROOM: "蘑菇",
  ITEM_MUTATION: "异变",
  ITEM_NIGHT_GOGGLES: "夜视镜",
  ITEM_PADDING: "护垫",
  ITEM_PEACOCK: "孔雀",
  ITEM_PEACEFUL_BEE: "和平蜜蜂",
  ITEM_PILE_OF_BOOKS: "书堆",
  ITEM_PLASTIC_EXPLOSIVE: "塑性炸药",
  ITEM_POISONOUS_TONIC: "毒性补品",
  ITEM_POTION: "再生药水",
  ITEM_POWER_GENERATOR: "发电机",
  ITEM_PROPELLER_HAT: "螺旋桨帽",
  ITEM_RATZILLA: "碰碰狗",
  ITEM_RECYCLING_MACHINE: "回收装置",
  ITEM_REINFORCED_STEEL: "强化钢",
  ITEM_RETROMATIONS_HOODIE: "Retromation的连帽衫",
  ITEM_RIP_AND_TEAR: "撕裂",
  ITEM_RIPOSTE: "反击",
  ITEM_ROBOT_ARM: "机械臂",
  ITEM_SALTWATER: "盐水",
  ITEM_SCARED_SAUSAGE: "害怕的香肠",
  ITEM_SEASHELL: "海贝壳",
  ITEM_SHADY_POTION: "阴影药水",
  ITEM_SIFDS_RELIC: "Sifd的圣物",
  ITEM_SILVER_BULLET: "银质子弹",
  ITEM_SNOWBALL: "雪球",
  ITEM_SUNGLASSES: "墨镜",
  ITEM_TARDIGRADE: "水熊虫",
  ITEM_TENTACLE: "触手",
  ITEM_TERRIFIED_ONION: "惊恐的洋葱",
  ITEM_TREASURE_MAP: "藏宝图",
  ITEM_TRIANGLE_OF_POWER: "三角之力",
  ITEM_TURRET_FLAME: "燃烧炮塔",
  ITEM_TURRET_HEALING: "医疗炮塔",
  ITEM_TURRET_LASER: "激光炮塔",
  ITEM_TURRET_ROCKET: "爆炸炮塔",
  ITEM_UGLY_TOOTH: "丑牙",
  ITEM_VIGILANTE_RING: "义警戒指",
  ITEM_WANDERING_BOT: "流浪机器人",
  ITEM_WARRIOR_HELMET: "士兵头盔",
  ITEM_WHEELBARROW: "独轮车",
  ITEM_WHETSTONE: "磨刀石",
  ITEM_WHISTLE: "哨子",
  ITEM_WILL_O_THE_WISP: "鬼火",
  ITEM_WINGS: "翅膀",
  WEAPON_BLUNDERBUSS: "喇叭枪",
  WEAPON_CHAIN_GUN: "链枪",
  WEAPON_DEXTROYER: "DEX终结者",
  WEAPON_DOUBLE_BARREL_SHOTGUN: "双管霰弹枪",
  WEAPON_FIGHTING_STICK: "短木棍",
  WEAPON_FIREBALL: "火球",
  WEAPON_FLAMETHROWER: "喷火器",
  WEAPON_FLAMING_BRASS_KNUCKLES: "烈焰黄铜指虎",
  WEAPON_GATLING_LASER: "加特林激光",
  WEAPON_GHOST_FLINT: "幽魂燧石",
  WEAPON_GHOST_SCEPTER: "幽魂节杖",
  WEAPON_GRENADE_LAUNCHER: "榴弹发射器",
  WEAPON_HARPOON_GUN: "鱼叉枪",
  WEAPON_HIKING_STICK: "登山杖",
  WEAPON_JOUSTING_LANCE: "骑枪",
  WEAPON_LASER_GUN: "激光枪",
  WEAPON_MEDICAL_GUN: "医疗枪",
  WEAPON_NUCLEAR_LAUNCHER: "核弹发射器",
  WEAPON_OBLITERATOR: "毁灭者",
  WEAPON_PARTICLE_ACCELERATOR: "粒子加速器",
  WEAPON_PLASMA_SLEDGEHAMMER: "等离子大锤",
  WEAPON_POTATO_THROWER: "土豆发射器",
  WEAPON_SCISSORS: "剪刀",
  WEAPON_SCREWDRIVER: "螺丝刀",
  WEAPON_SLINGSHOT: "弹弓",
  WEAPON_THUNDER_SWORD: "雷剑",
  WEAPON_TRIDENT: "三叉戟",
};

function readPck(path) {
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 4).toString("ascii") !== "GDPC") {
    throw new Error(`Unsupported PCK header: ${path}`);
  }

  const fileCount = buffer.readUInt32LE(84);
  let offset = 88;
  const files = [];

  for (let index = 0; index < fileCount; index += 1) {
    const pathLength = buffer.readUInt32LE(offset);
    offset += 4;
    const resourcePath = buffer
      .subarray(offset, offset + pathLength)
      .toString("utf8")
      .replace(/\0+$/, "");
    offset += pathLength;
    const dataOffset = Number(buffer.readBigUInt64LE(offset));
    offset += 8;
    const size = Number(buffer.readBigUInt64LE(offset));
    offset += 8;
    const md5 = buffer.subarray(offset, offset + 16).toString("hex");
    offset += 16;
    files.push({ path: resourcePath, dataOffset, size, md5 });
  }

  return { path, buffer, files };
}

function parseTranslation(pck, locale) {
  const entry = pck.files.find((file) =>
    file.path.endsWith(`translations.${locale}.translation`),
  );
  if (!entry) return new Map();

  const data = pck.buffer.subarray(entry.dataOffset, entry.dataOffset + entry.size);
  const classOffset = data.indexOf(Buffer.from("PHashTranslation\0"), 100);
  if (classOffset === -1) {
    throw new Error(`Missing PHashTranslation object in ${entry.path}`);
  }

  let offset = classOffset + "PHashTranslation\0".length;
  const propertyCount = data.readUInt32LE(offset);
  offset += 4;
  const properties = {};

  for (let propertyIndex = 0; propertyIndex < propertyCount; propertyIndex += 1) {
    const nameIndex = data.readUInt32LE(offset);
    offset += 4;
    const type = data.readUInt32LE(offset);
    offset += 4;

    if (type === 5) {
      const byteLength = data.readUInt32LE(offset);
      properties[nameIndex] = data
        .subarray(offset + 4, offset + 4 + byteLength)
        .toString("utf8")
        .replace(/\0+$/, "");
      offset += 4 + byteLength;
    } else if (type === 32) {
      const length = data.readUInt32LE(offset);
      offset += 4;
      properties[nameIndex] = Array.from({ length }, (_, index) =>
        data.readInt32LE(offset + index * 4),
      );
      offset += length * 4;
    } else if (type === 31) {
      const byteLength = data.readUInt32LE(offset);
      offset += 4;
      properties[nameIndex] = data.subarray(offset, offset + byteLength);
      offset += byteLength;
    } else {
      throw new Error(`Unsupported translation property type ${type} in ${entry.path}`);
    }
  }

  const hashTable = properties[4];
  const bucketTable = properties[5];
  const stringPool = properties[6];
  const messages = new Map();

  new Set(hashTable.filter((value) => value >= 0)).forEach((bucketOffset) => {
    const bucketSize = bucketTable[bucketOffset];
    for (let index = 0; index < bucketSize; index += 1) {
      const entryOffset = bucketOffset + 2 + index * 4;
      const hash = bucketTable[entryOffset];
      const stringOffset = bucketTable[entryOffset + 1];
      const byteLength = bucketTable[entryOffset + 2];
      const raw = stringPool.subarray(stringOffset, stringOffset + byteLength);
      const value = raw.toString("utf8").replace(/\0+$/, "");
      if (!value.includes("\uFFFD")) {
        messages.set(hash, value);
      }
    }
  });

  return messages;
}

function catalogKeys(catalog) {
  const seen = new Map();
  catalog.records
    .filter(
      (record) =>
        record.kind === "weapon" || record.kind === "item" || record.kind === "character",
    )
    .forEach((record) => {
      if (!seen.has(record.nameKey)) {
        seen.set(record.nameKey, {
          kind: record.kind,
          nameKey: record.nameKey,
          sourcePackages: new Set(),
        });
      }
      seen.get(record.nameKey).sourcePackages.add(record.sourcePackage);
    });

  return [...seen.values()].map((entry) => ({
    ...entry,
    sourcePackages: [...entry.sourcePackages],
  }));
}

function displayNameFromKey(nameKey) {
  if (ENGLISH_NAME_OVERRIDES[nameKey]) return ENGLISH_NAME_OVERRIDES[nameKey];

  const words = nameKey
    .replace(/^(ITEM|WEAPON)_/, "")
    .replace(/^CHARACTER_/, "")
    .toLowerCase()
    .split("_")
    .map((word) => {
      if (word === "smg") return "SMG";
      if (word === "dex") return "DEX";
      if (word === "o") return "O";
      return word.charAt(0).toUpperCase() + word.slice(1);
    });

  return words.join(" ");
}

function buildEnglishToChineseMap(packages) {
  const result = new Map();

  packages.forEach((sourcePackage) => {
    const english = parseTranslation(sourcePackage, "en");
    const chinese = parseTranslation(sourcePackage, "zh");
    english.forEach((englishValue, hash) => {
      const chineseValue = chinese.get(hash);
      if (chineseValue) result.set(englishValue, chineseValue);
    });
  });

  return result;
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const loadedPackages = packageInputs
  .filter((input) => existsSync(input.path))
  .map((input) => ({ ...input, ...readPck(input.path) }));

if (!loadedPackages.length) {
  console.error(`No Brotato packages found under: ${installDir}`);
  process.exit(1);
}

const englishToChinese = buildEnglishToChineseMap(loadedPackages);
const entries = {};

catalogKeys(catalog).forEach((entry) => {
  const enName = displayNameFromKey(entry.nameKey);
  const autoCnName = englishToChinese.get(enName);
  const manualCnName = CHINESE_NAME_OVERRIDES[entry.nameKey];
  const cnName = manualCnName ?? autoCnName ?? null;

  entries[entry.nameKey] = {
    kind: entry.kind,
    enName,
    cnName,
    source: manualCnName ? "manual-override" : autoCnName ? "translation-join" : "missing",
    sourcePackages: entry.sourcePackages,
  };
});

const allEntries = Object.values(entries);
const summary = {
  total: allEntries.length,
  localized: allEntries.filter((entry) => entry.cnName).length,
  missing: allEntries.filter((entry) => !entry.cnName).length,
  byKind: {
    weapon: {
      total: allEntries.filter((entry) => entry.kind === "weapon").length,
      localized: allEntries.filter((entry) => entry.kind === "weapon" && entry.cnName).length,
    },
    item: {
      total: allEntries.filter((entry) => entry.kind === "item").length,
      localized: allEntries.filter((entry) => entry.kind === "item" && entry.cnName).length,
    },
    character: {
      total: allEntries.filter((entry) => entry.kind === "character").length,
      localized: allEntries.filter((entry) => entry.kind === "character" && entry.cnName).length,
    },
  },
  bySource: allEntries.reduce((counts, entry) => {
    counts[entry.source] = (counts[entry.source] ?? 0) + 1;
    return counts;
  }, {}),
};

const output = {
  packages: loadedPackages.map((sourcePackage) => ({
    id: sourcePackage.id,
    file: basename(sourcePackage.path),
  })),
  summary,
  entries,
};

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${summary.localized}/${summary.total} localized names to ${outputPath}`);
} else {
  console.log(JSON.stringify(summary, null, 2));
  console.log("\nRun with --write to generate data/official-localization.json");
}
