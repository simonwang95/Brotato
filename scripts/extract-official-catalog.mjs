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

function readPackageText(path) {
  if (!existsSync(path)) return null;
  const decoder = new TextDecoder("utf-8", { fatal: false });
  return decoder.decode(readFileSync(path));
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

function getArrayRefs(block, key) {
  const match = block.match(new RegExp(`${key} = \\[([^\\]]*)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/ExtResource\(\s*(\d+)\s*\)/g)].map((item) =>
    Number(item[1]),
  );
}

function collectExtResources(block) {
  return Object.fromEntries(
    [...block.matchAll(/\[ext_resource path="([^"]+)" type="([^"]+)" id=(\d+)\]/g)].map(
      ([, path, type, id]) => [Number(id), { path, type }],
    ),
  );
}

function normalizeRecord(kind, block, sourcePackage) {
  const extResources = collectExtResources(block);
  const setRefs = getArrayRefs(block, "sets");
  const effectRefs = getArrayRefs(block, "effects");

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
    effectPaths: effectRefs.map((id) => extResources[id]?.path).filter(Boolean),
  };

  if (kind === "weapon") {
    record.weaponId = getString(block, "weapon_id");
    record.weaponType = getNumber(block, "type");
    record.upgradesInto = getString(block, "upgrades_into");
  }

  return record;
}

function parsePackage(text, sourcePackage) {
  const records = [];
  const blocks = text.split("[gd_resource");

  blocks.forEach((partialBlock) => {
    const block = `[gd_resource${partialBlock}`;
    const itemId = getString(block, "my_id");
    if (!itemId) return;

    if (itemId.startsWith("item_")) {
      records.push(normalizeRecord("item", block, sourcePackage));
    } else if (itemId.startsWith("weapon_")) {
      records.push(normalizeRecord("weapon", block, sourcePackage));
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
  const text = readPackageText(input.path);
  if (!text) return;
  loadedPackages.push(input);
  records.push(...parsePackage(text, input.id));
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
