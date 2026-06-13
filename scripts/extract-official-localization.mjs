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
  ITEM_CYBERBALL: "赛博球",
  ITEM_EYES_SURGERY: "眼部手术",
  ITEM_HUNTING_TROPHY: "狩猎战利品",
  ITEM_LUCKY_CHARM: "护身符",
  ITEM_NIGHT_GOGGLES: "夜视镜",
  ITEM_POWER_GENERATOR: "发电机",
  ITEM_ROBOT_ARM: "机械臂",
  ITEM_SCARED_SAUSAGE: "害怕的香肠",
  ITEM_SIFDS_RELIC: "Sifd的圣物",
  ITEM_WHETSTONE: "磨刀石",
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
    .filter((record) => record.kind === "weapon" || record.kind === "item")
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
