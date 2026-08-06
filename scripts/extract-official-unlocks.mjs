import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import {
  getUncompressedOptimizedMessage,
  parseOptimizedTranslation,
} from "./optimized-translation.mjs";
import { buildSourceMetadata } from "./extraction-metadata.mjs";

const defaultInstallDir =
  "***REMOVED***/Library/Application Support/Steam/steamapps/common/Brotato";

const installDir = process.env.BROTATO_INSTALL_DIR || defaultInstallDir;
const outputPath = process.env.BROTATO_UNLOCKS_OUTPUT || "data/official-unlocks.json";
const basePackagePath = join(installDir, "Brotato.app/Contents/Resources/Brotato.pck");
const dlcPackagePath = join(installDir, "BrotatoAbyssalTerrors.pck");
const pendingTextReason =
  "已定位静态 challenge 奖励和翻译 key，但当前未能从 PHashTranslation 可靠读取简中描述；保留待人工核验或后续解码。";

const STAT_LABELS = {
  pickup_range: { en: "% Pickup Range", zh: "%拾取范围" },
  stat_armor: { en: "Armor", zh: "护甲" },
  stat_attack_speed: { en: "% Attack Speed", zh: "%攻击速度" },
  stat_crit_chance: { en: "% Crit Chance", zh: "%暴击率" },
  stat_curse: { en: "Curse", zh: "诅咒" },
  stat_dodge: { en: "% Dodge", zh: "%闪避" },
  stat_elemental_damage: { en: "Elemental Damage", zh: "元素伤害" },
  stat_engineering: { en: "Engineering", zh: "工程学" },
  stat_harvesting: { en: "Harvesting", zh: "收获" },
  stat_hp_regeneration: { en: "HP Regeneration", zh: "生命再生" },
  stat_lifesteal: { en: "% Life Steal", zh: "%生命窃取" },
  stat_luck: { en: "Luck", zh: "幸运" },
  stat_max_hp: { en: "Max HP", zh: "最大生命值" },
  stat_melee_damage: { en: "Melee Damage", zh: "近战伤害" },
  stat_percent_damage: { en: "% Damage", zh: "%伤害" },
  stat_range: { en: "Range", zh: "范围" },
  stat_ranged_damage: { en: "Ranged Damage", zh: "远程伤害" },
  stat_speed: { en: "% Speed", zh: "%速度" },
};

function readPck(path) {
  const buffer = readFileSync(path);
  if (buffer.subarray(0, 4).toString("ascii") !== "GDPC") {
    throw new Error(`Unsupported PCK header: ${path}`);
  }

  const fileCount = buffer.readUInt32LE(84);
  let offset = 88;
  const files = new Map();

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
    offset += 16;
    files.set(resourcePath, buffer.subarray(dataOffset, dataOffset + size));
  }

  return files;
}

function getString(block, key) {
  return block.match(new RegExp(`${key} = "([^"]*)"`))?.[1] ?? null;
}

function getNumber(block, key) {
  const match = block.match(new RegExp(`${key} = (-?\\d+)`));
  return match ? Number(match[1]) : null;
}

function getLineValue(block, key) {
  return block.match(new RegExp(`^${key} = (.+)$`, "m"))?.[1]?.trim() ?? null;
}

function getResourceRef(block, key) {
  const match = block.match(new RegExp(`${key} = ExtResource\\(\\s*(\\d+)\\s*\\)`));
  return match ? Number(match[1]) : null;
}

function collectExtResources(block) {
  return Object.fromEntries(
    [...block.matchAll(/\[ext_resource path="([^"]+)" type="([^"]+)" id=(\d+)\]/g)].map(
      ([, path, type, id]) => [Number(id), { path, type }],
    ),
  );
}

function challengeIconPath(extResources) {
  return Object.values(extResources).find((resource) => resource.type === "Texture")?.path ?? null;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  const headers = rows.shift();
  return rows.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] || ""])));
}

function characterIdFromResourcePath(path) {
  const raw = path?.match(/characters\/([^/]+)\/[^/]+_data\.tres$/)?.[1] ?? null;
  if (!raw) return null;
  return raw.replace(/_([a-z])/g, (_match, letter) => letter.toUpperCase());
}

function challengeLocalizations(baseFiles) {
  const csvResource = baseFiles.get("res://tools/output/achievementLocalizations.csv");
  if (!csvResource) return new Map();

  const result = new Map();
  parseCsv(csvResource.toString("utf8")).forEach((row) => {
    if (row.locale !== "default" && row.locale !== "zh-Hans") return;
    const entry = result.get(row.name) ?? {};
    entry[row.locale] = {
      title: row.lockedTitle,
      description: row.lockedDescription,
    };
    result.set(row.name, entry);
  });
  return result;
}

function optimizedTranslations(packageFiles) {
  const loadLocale = (locale) => {
    const entry = [...packageFiles.entries()].find(([path]) =>
      path.endsWith(`translations.${locale}.translation`),
    );
    return entry ? parseOptimizedTranslation(entry[1]) : null;
  };

  return {
    default: loadLocale("en"),
    "zh-Hans": loadLocale("zh"),
  };
}

function parseAdditionalArgs(block) {
  const raw = getLineValue(block, "additional_args");
  if (!raw) return [];

  return [...raw.matchAll(/"([^"]*)"|(-?\d+(?:\.\d+)?)/g)].map(
    ([, stringValue, numberValue]) => stringValue ?? numberValue,
  );
}

function translatedArgument(translation, value) {
  const key = String(value ?? "");
  return getUncompressedOptimizedMessage(translation, key) ?? key;
}

function formatChallengeText(text, block, locale, translation) {
  if (!text) return null;

  const stat = getString(block, "stat");
  const statLabel = stat
    ? getUncompressedOptimizedMessage(translation, stat.toUpperCase()) ??
      STAT_LABELS[stat]?.[locale === "zh-Hans" ? "zh" : "en"] ??
      stat
    : "";
  const args = [
    String(getNumber(block, "value") ?? ""),
    statLabel,
    ...parseAdditionalArgs(block).map((value) => translatedArgument(translation, value)),
  ];

  return text.replace(/\{(\d+)\}/g, (placeholder, rawIndex) => {
    const index = Number(rawIndex);
    return args[index] ?? placeholder;
  });
}

function optimizedLocalizationForChallenge(block, translations) {
  const nameKey = getString(block, "name");
  const descriptionKey = getString(block, "description");
  const localized = {};

  [
    ["default", translations.default],
    ["zh-Hans", translations["zh-Hans"]],
  ].forEach(([locale, translation]) => {
    const title = getUncompressedOptimizedMessage(translation, nameKey);
    const rawDescription = getUncompressedOptimizedMessage(translation, descriptionKey);
    const description = formatChallengeText(rawDescription, block, locale, translation);
    if (title || description) localized[locale] = { title, description };
  });

  return Object.keys(localized).length ? localized : null;
}

function templateLocalizationForChallenge(block) {
  const descriptionKey = getString(block, "description");
  if (descriptionKey !== "CHAL_STAT_DESC") return null;

  const stat = getString(block, "stat");
  const statLabel = STAT_LABELS[stat];
  const value = getNumber(block, "value");
  if (!statLabel || value === null) return null;

  return {
    default: {
      title: null,
      description: `Reach ${value} ${statLabel.en}`,
    },
    "zh-Hans": {
      title: null,
      description: `达到${value}${statLabel.zh}`,
    },
  };
}

function extractCharacterUnlocks(
  packageFiles,
  sourcePackage,
  localizations = new Map(),
  translations = optimizedTranslations(packageFiles),
) {
  return [...packageFiles.entries()]
    .filter(([path]) => path.includes("/challenges/") && path.endsWith(".tres"))
    .map(([path, resource]) => {
      const block = resource.toString("utf8");
      const extResources = collectExtResources(block);
      const reward = extResources[getResourceRef(block, "reward")]?.path ?? null;
      const iconPath = challengeIconPath(extResources);
      const characterId = characterIdFromResourcePath(reward);
      if (getNumber(block, "reward_type") !== 6 || !characterId) return null;

      const challengeId = getString(block, "my_id");
      const localization =
        localizations.get(challengeId) ??
        optimizedLocalizationForChallenge(block, translations) ??
        templateLocalizationForChallenge(block) ??
        {};
      const extractionStatus = localization["zh-Hans"]?.description
        ? "verified-static-text"
        : "pending-text";
      const pendingFields =
        extractionStatus === "pending-text"
          ? {
              pendingReason: pendingTextReason,
              pendingEvidence: {
                challengeId,
                nameKey: getString(block, "name"),
                descriptionKey: getString(block, "description"),
                value: getNumber(block, "value"),
                number: getNumber(block, "number"),
                stat: getString(block, "stat"),
                additionalArgs: getLineValue(block, "additional_args"),
                challengeIconPath: iconPath,
                challengePath: path,
                rewardPath: reward,
              },
            }
          : {};

      return {
        characterId,
        challengeId,
        sourcePackage,
        challengePath: path,
        rewardPath: reward,
        nameKey: getString(block, "name"),
        descriptionKey: getString(block, "description"),
        value: getNumber(block, "value"),
        number: getNumber(block, "number"),
        stat: getString(block, "stat"),
        additionalArgs: getLineValue(block, "additional_args"),
        challengeIconPath: iconPath,
        title: localization.default?.title ?? null,
        description: localization.default?.description ?? null,
        zhTitle: localization["zh-Hans"]?.title ?? null,
        zhDescription: localization["zh-Hans"]?.description ?? null,
        extractionStatus,
        ...pendingFields,
      };
    })
    .filter(Boolean)
    .sort((left, right) => left.characterId.localeCompare(right.characterId));
}

if (!existsSync(basePackagePath)) {
  console.error(`Missing Brotato base package: ${basePackagePath}`);
  process.exit(1);
}

const baseFiles = readPck(basePackagePath);
const packages = [
  {
    id: "base",
    file: basename(basePackagePath),
    records: extractCharacterUnlocks(baseFiles, "base", challengeLocalizations(baseFiles)),
  },
];

if (existsSync(dlcPackagePath)) {
  const dlcFiles = readPck(dlcPackagePath);
  packages.push({
    id: "abyssalTerrors",
    file: basename(dlcPackagePath),
    records: extractCharacterUnlocks(dlcFiles, "abyssalTerrors"),
  });
}

const records = packages.flatMap((sourcePackage) => sourcePackage.records);
const output = {
  sourceMetadata: buildSourceMetadata(installDir, [
    { id: "base", path: basePackagePath },
    { id: "abyssalTerrors", path: dlcPackagePath },
  ]),
  generatedFrom: packages.map(({ id, file }) => ({ id, file })),
  note:
    "Static install-package data only. This does not read save files and is not affected by local unlock progress.",
  summary: {
    total: records.length,
    verifiedStaticText: records.filter((record) => record.extractionStatus === "verified-static-text").length,
    pendingText: records.filter((record) => record.extractionStatus === "pending-text").length,
    pendingBySourcePackage: records
      .filter((record) => record.extractionStatus === "pending-text")
      .reduce((counts, record) => {
        counts[record.sourcePackage] = (counts[record.sourcePackage] ?? 0) + 1;
        return counts;
      }, {}),
  },
  records,
};

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${records.length} unlock records to ${outputPath}`);
} else {
  console.log(JSON.stringify(output.summary, null, 2));
  console.log("\nRun with --write to generate data/official-unlocks.json");
}
