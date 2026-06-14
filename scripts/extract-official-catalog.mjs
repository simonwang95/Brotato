import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, join } from "node:path";
import { TextDecoder } from "node:util";

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
  const match = block.match(new RegExp(`${key} = "([^"]*)"`));
  return match?.[1] ?? null;
}

function getNumber(block, key) {
  const match = block.match(new RegExp(`${key} = (-?\\d+(?:\\.\\d+)?)`));
  return match ? Number(match[1]) : null;
}

function getBoolean(block, key) {
  const match = block.match(new RegExp(`${key} = (true|false)`));
  return match ? asBool(match[1]) : null;
}

function getLineValue(block, key) {
  const match = block.match(new RegExp(`^${key} = (.+)$`, "m"));
  return match?.[1]?.trim() ?? null;
}

function getResourceRef(block, key) {
  const match = block.match(new RegExp(`${key} = ExtResource\\(\\s*(\\d+)\\s*\\)`));
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

function parseEffectDetail(path, block) {
  if (!path || !block) return null;
  const extResources = collectExtResources(block);
  const scriptRef = getResourceRef(block, "script");

  return {
    path,
    scriptPath: extResources[scriptRef]?.path ?? null,
    key: getString(block, "key"),
    textKey: getString(block, "text_key"),
    value: getNumber(block, "value"),
    customKey: getString(block, "custom_key"),
    storageMethod: getNumber(block, "storage_method"),
    effectSign: getNumber(block, "effect_sign"),
    chance: getNumber(block, "chance"),
    trackingText: getString(block, "tracking_text"),
    customArgs: getLineValue(block, "custom_args"),
    setId: getString(block, "set_id"),
    statDisplayedName: getString(block, "stat_displayed_name"),
    statName: getString(block, "stat_name"),
    statDisplayed: getString(block, "stat_displayed"),
    statsModified: getArrayStrings(block, "stats_modified"),
    nbStatScaled: getNumber(block, "nb_stat_scaled"),
    statScaled: getString(block, "stat_scaled"),
    permStatsOnly: getBoolean(block, "perm_stats_only"),
  };
}

function normalizeRecord(kind, block, sourcePackage, resources = new Map()) {
  const extResources = collectExtResources(block);
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
    tier: getNumber(block, "tier"),
    value: getNumber(block, "value"),
    unlockedByDefault: getBoolean(block, "unlocked_by_default"),
    canBeLooted: getBoolean(block, "can_be_looted"),
    isCursed: getBoolean(block, "is_cursed"),
    curseFactor: getNumber(block, "curse_factor"),
    setPaths: setRefs.map((id) => extResources[id]?.path).filter(Boolean),
    effectPaths,
    effects: effectPaths
      .map((effectPath) => parseEffectDetail(effectPath, resources.get(effectPath)))
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

const catalog = {
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
