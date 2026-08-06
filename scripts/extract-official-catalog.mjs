import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { TextDecoder } from "node:util";
import { buildSourceMetadata } from "./extraction-metadata.mjs";

const defaultInstallDir =
  "***REMOVED***/Library/Application Support/Steam/steamapps/common/Brotato";

const installDir = process.env.BROTATO_INSTALL_DIR || defaultInstallDir;
const outputPath = process.env.BROTATO_CATALOG_OUTPUT || "data/official-catalog.json";
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

function readPackage(path) {
  if (!existsSync(path)) return null;
  const bytes = readFileSync(path);
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const text = decoder.decode(bytes);

  if (bytes.slice(0, 4).toString("ascii") !== "GDPC") {
    return { text, resources: new Map() };
  }

  const fileCount = bytes.readUInt32LE(84);
  let position = 88;
  const resources = new Map();

  for (let index = 0; index < fileCount; index += 1) {
    const pathLength = bytes.readUInt32LE(position);
    position += 4;
    const resourcePath = bytes
      .slice(position, position + pathLength)
      .toString("utf8")
      .replace(/\0+$/, "");
    position += pathLength;

    const offset = Number(bytes.readBigUInt64LE(position));
    position += 8;
    const size = Number(bytes.readBigUInt64LE(position));
    position += 8;
    position += 16;

    if (resourcePath.endsWith(".tres") || resourcePath.endsWith(".tscn")) {
      resources.set(resourcePath, decoder.decode(bytes.slice(offset, offset + size)));
    }
  }

  return { text, resources };
}

function asBool(value) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function getString(block, key) {
  const match = block.match(new RegExp(`(?:^|\\s)${key} = "([^"]*)"`));
  return match?.[1] ?? null;
}

function getNumber(block, key) {
  const match = block.match(new RegExp(`(?:^|\\s)${key} = (-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : null;
}

function getBoolean(block, key) {
  const match = block.match(new RegExp(`(?:^|\\s)${key} = (true|false)`));
  return match ? asBool(match[1]) : null;
}

function getLineValue(block, key) {
  const match = block.match(new RegExp(`(?:^|\\s)${key} = (.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function getResourceRef(block, key) {
  const match = block.match(
    new RegExp(`(?:^|\\s)${key} = ExtResource\\(\\s*(\\d+)\\s*\\)`),
  );
  return match ? Number(match[1]) : null;
}

function getArrayRefs(block, key) {
  const match = block.match(new RegExp(`${key} = \\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/ExtResource\(\s*(\d+)\s*\)/g)].map((item) =>
    Number(item[1]),
  );
}

function getArrayStrings(block, key) {
  const match = block.match(new RegExp(`${key} = \\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function collectExtResources(block) {
  return Object.fromEntries(
    [...block.matchAll(/\[ext_resource path="([^"]+)" type="([^"]+)" id=(\d+)\]/g)].map(
      ([, path, type, id]) => [Number(id), { path, type }],
    ),
  );
}

function parseScalingStats(block) {
  const raw = getLineValue(block, "scaling_stats");
  if (!raw) return [];

  return [...raw.matchAll(/\[\s*"([^"]+)"\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g)].map(
    ([, stat, value]) => ({
      stat,
      value: Number(value),
    }),
  );
}

function parseNumberFields(block, keys) {
  return Object.fromEntries(
    keys.map((key) => [key, getNumber(block, key)]).filter(([, value]) => value !== null),
  );
}

function parseWeaponStats(path, block) {
  if (!path || !block) return null;
  const extResources = collectExtResources(block);
  const scriptRef = getResourceRef(block, "script");

  return {
    path,
    scriptPath: extResources[scriptRef]?.path ?? null,
    ...parseNumberFields(block, [
      "damage",
      "cooldown",
      "accuracy",
      "crit_chance",
      "crit_damage",
      "min_range",
      "max_range",
      "knockback",
      "knockback_piercing",
      "effect_scale",
      "lifesteal",
      "recoil",
      "recoil_duration",
      "speed_percent_modifier",
      "nb_projectiles",
      "projectile_spread",
      "piercing",
      "piercing_dmg_reduction",
      "bounce",
      "bounce_dmg_reduction",
      "projectile_speed",
      "attack_type",
    ]),
    scalingStats: parseScalingStats(block),
  };
}

const RELATED_RESOURCE_KEYS = [
  "weapon_stats",
  "ranged_weapon_stats",
  "burning_data",
  "explosion_effect",
  "landmine_effect_stat",
  "stats",
];

const RELATED_NUMBER_FIELDS = [
  "value2",
  "interval",
  "duration_secs",
  "max_stacks",
  "max_procs",
  "hp_threshold",
  "cooldown",
  "damage",
  "crit_chance",
  "crit_damage",
  "min_range",
  "max_range",
  "knockback",
  "piercing",
  "piercing_dmg_reduction",
  "bounce",
  "bounce_dmg_reduction",
  "nb_projectiles",
  "chance",
  "duration",
  "spread",
  "attack_cd",
  "spawn_cooldown",
  "base_smoke_amount",
  "scale",
  "boost_zone_scale",
  "double_chance",
  "health_boost",
  "revive_duration",
];

const RELATED_BOOLEAN_FIELDS = ["reset_on_hit"];

function parseBooleanFields(block, keys) {
  return Object.fromEntries(
    keys.map((key) => [key, getBoolean(block, key)]).filter(([, value]) => value !== null),
  );
}

function parseRelatedResource(path, block, resources, seen = new Set()) {
  if (!path || !block || seen.has(path)) return null;
  const nextSeen = new Set(seen).add(path);
  const extResources = collectExtResources(block);
  const resourceBlock = block.match(/\[resource\]\s*([\s\S]*)$/)?.[1] ?? block;
  const scriptRef = getResourceRef(resourceBlock, "script");
  const result = {
    path,
    scriptPath: extResources[scriptRef]?.path ?? null,
    ...parseNumberFields(resourceBlock, RELATED_NUMBER_FIELDS),
    ...parseBooleanFields(resourceBlock, RELATED_BOOLEAN_FIELDS),
    scalingStats: parseScalingStats(resourceBlock),
  };

  RELATED_RESOURCE_KEYS.forEach((key) => {
    const refPath = extResources[getResourceRef(resourceBlock, key)]?.path;
    const refBlock = refPath ? resources.get(refPath) : null;
    if (!refPath || !refBlock) return;
    const nested = parseRelatedResource(refPath, refBlock, resources, nextSeen);
    if (nested) result[key] = nested;
  });

  Object.keys(result).forEach((key) => {
    if (result[key] === null || (Array.isArray(result[key]) && !result[key].length)) {
      delete result[key];
    }
  });
  return result;
}

function parseEffectDetail(path, block, resources, seen = new Set()) {
  if (!path || !block || seen.has(path)) return null;
  const nextSeen = new Set(seen).add(path);
  const extResources = collectExtResources(block);
  const resourceBlock = block.match(/\[resource\]\s*([\s\S]*)$/)?.[1] ?? block;
  const scriptRef = getResourceRef(resourceBlock, "script");
  const stat = getString(resourceBlock, "stat");
  const statNb = getNumber(resourceBlock, "stat_nb");

  const effect = {
    path,
    scriptPath: extResources[scriptRef]?.path ?? null,
    key: getString(resourceBlock, "key"),
    textKey: getString(resourceBlock, "text_key"),
    value: getNumber(resourceBlock, "value"),
    customKey: getString(resourceBlock, "custom_key"),
    storageMethod: getNumber(resourceBlock, "storage_method"),
    effectSign: getNumber(resourceBlock, "effect_sign"),
    chance: getNumber(resourceBlock, "chance"),
    trackingText: getString(resourceBlock, "tracking_text"),
    customArgs: getLineValue(resourceBlock, "custom_args"),
    setId: getString(resourceBlock, "set_id"),
    statDisplayedName: getString(resourceBlock, "stat_displayed_name"),
    statName: getString(resourceBlock, "stat_name"),
    statDisplayed: getString(resourceBlock, "stat_displayed"),
    statsModified: getArrayStrings(resourceBlock, "stats_modified"),
    nbStatScaled: getNumber(resourceBlock, "nb_stat_scaled"),
    statScaled: getString(resourceBlock, "stat_scaled"),
    ...(stat ? { stat } : {}),
    ...(Number.isFinite(statNb) ? { statNb } : {}),
    permStatsOnly: getBoolean(resourceBlock, "perm_stats_only"),
  };

  const effectParameters = {
    ...parseNumberFields(resourceBlock, RELATED_NUMBER_FIELDS),
    ...parseBooleanFields(resourceBlock, RELATED_BOOLEAN_FIELDS),
  };
  if (Object.keys(effectParameters).length) effect.effectParameters = effectParameters;

  const relatedResources = {};
  RELATED_RESOURCE_KEYS.forEach((key) => {
    const resourcePath = extResources[getResourceRef(resourceBlock, key)]?.path;
    const relatedBlock = resourcePath ? resources.get(resourcePath) : null;
    const related = resourcePath && relatedBlock
      ? parseRelatedResource(resourcePath, relatedBlock, resources)
      : null;
    if (related) relatedResources[key] = related;
  });
  if (Object.keys(relatedResources).length) effect.relatedResources = relatedResources;

  const subEffects = getArrayRefs(resourceBlock, "sub_effects")
    .map((ref) => extResources[ref]?.path)
    .filter(Boolean)
    .map((subEffectPath) =>
      parseEffectDetail(subEffectPath, resources.get(subEffectPath), resources, nextSeen),
    )
    .filter(Boolean);
  if (subEffects.length) effect.subEffects = subEffects;

  return effect;
}

function normalizeRecord(kind, block, sourcePackage, resources = new Map()) {
  const extResources = collectExtResources(block);
  const iconRef = getResourceRef(block, "icon");
  const setRefs = getArrayRefs(block, "sets");
  const effectRefs = getArrayRefs(block, "effects");
  const startingWeaponRefs = getArrayRefs(block, "starting_weapons");
  const startingItemRefs = getArrayRefs(block, "starting_items");
  const effectPaths = effectRefs.map((id) => extResources[id]?.path).filter(Boolean);

  const record = {
    id: getString(block, "my_id"),
    kind,
    sourcePackage,
    nameKey: getString(block, "name"),
    iconResourcePath: extResources[iconRef]?.path ?? null,
    expectedImageAssetPath: getString(block, "my_id")
      ? `data/assets/${kind}s/${getString(block, "my_id")}.webp`
      : null,
    tier: getNumber(block, "tier"),
    value: getNumber(block, "value"),
    unlockedByDefault: getBoolean(block, "unlocked_by_default"),
    canBeLooted: getBoolean(block, "can_be_looted"),
    isCursed: getBoolean(block, "is_cursed"),
    curseFactor: getNumber(block, "curse_factor"),
    setPaths: setRefs.map((id) => extResources[id]?.path).filter(Boolean),
    effectPaths,
    effects: effectPaths
      .map((effectPath) => parseEffectDetail(effectPath, resources.get(effectPath), resources))
      .filter(Boolean),
  };

  if (kind === "weapon") {
    const statsRef = getResourceRef(block, "stats");
    const statsPath = extResources[statsRef]?.path ?? null;
    record.weaponId = getString(block, "weapon_id");
    record.weaponType = getNumber(block, "type");
    record.upgradesInto = getString(block, "upgrades_into");
    record.statsPath = statsPath;
    record.stats = parseWeaponStats(statsPath, resources.get(statsPath));
  } else if (kind === "character") {
    record.maxNb = getNumber(block, "max_nb");
    record.wantedTags = getArrayStrings(block, "wanted_tags");
    record.bannedItemGroups = getArrayStrings(block, "banned_item_groups");
    record.bannedItems = getArrayStrings(block, "banned_items");
    record.bannedUpgrades = getArrayStrings(block, "banned_upgrades");
    record.startingWeaponPaths = startingWeaponRefs
      .map((id) => extResources[id]?.path)
      .filter(Boolean);
    record.startingItemPaths = startingItemRefs.map((id) => extResources[id]?.path).filter(Boolean);
  }

  return record;
}

function parsePackage(pkg, sourcePackage) {
  const records = [];
  const resourceBlocks = pkg.resources.size
    ? [...pkg.resources.values()]
    : pkg.text.split("[gd_resource").map((partialBlock) => `[gd_resource${partialBlock}`);

  resourceBlocks.forEach((block) => {
    const itemId = getString(block, "my_id");
    if (!itemId) return;

    if (itemId.startsWith("item_")) {
      records.push(normalizeRecord("item", block, sourcePackage, pkg.resources));
    } else if (itemId.startsWith("weapon_")) {
      records.push(normalizeRecord("weapon", block, sourcePackage, pkg.resources));
    } else if (itemId.startsWith("character_")) {
      records.push(normalizeRecord("character", block, sourcePackage, pkg.resources));
    }
  });

  return records;
}

function summarize(records) {
  const byKind = records.reduce((summary, record) => {
    summary[record.kind] = (summary[record.kind] ?? 0) + 1;
    return summary;
  }, {});
  const byPackage = records.reduce((summary, record) => {
    summary[record.sourcePackage] = (summary[record.sourcePackage] ?? 0) + 1;
    return summary;
  }, {});

  return {
    total: records.length,
    byKind,
    byPackage,
  };
}

const loadedPackages = [];
const records = [];

packageInputs.forEach((input) => {
  const pkg = readPackage(input.path);
  if (!pkg) return;
  loadedPackages.push(input);
  records.push(...parsePackage(pkg, input.id));
});

if (!loadedPackages.length) {
  console.error(`No Brotato packages found under: ${installDir}`);
  process.exit(1);
}

records.sort((a, b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));

const sourceMetadata = buildSourceMetadata(installDir, packageInputs);
const catalog = {
  sourceMetadata,
  packages: loadedPackages.map((sourcePackage) => ({
    id: sourcePackage.id,
    file: basename(sourcePackage.path),
  })),
  summary: summarize(records),
  records,
};

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Wrote ${records.length} records to ${outputPath}`);
} else {
  console.log(JSON.stringify(catalog.summary, null, 2));
  console.log("\nSample records:");
  records.slice(0, 12).forEach((record) => {
    console.log(
      `- ${record.kind} ${record.id} ${record.nameKey} tier=${record.tier} value=${record.value} source=${record.sourcePackage}`,
    );
  });
  console.log("\nRun with --write to generate data/official-catalog.json");
}
