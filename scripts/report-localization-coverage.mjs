import { readFileSync } from "node:fs";

const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const localizationPath =
  process.env.BROTATO_LOCALIZATION_PATH || "data/official-localization.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const localization = JSON.parse(readFileSync(localizationPath, "utf8"));

function uniqueCatalogEntries(kind) {
  const byKey = new Map();
  catalog.records
    .filter((record) => record.kind === kind)
    .forEach((record) => {
      if (!byKey.has(record.nameKey)) {
        byKey.set(record.nameKey, {
          kind,
          nameKey: record.nameKey,
          sourcePackages: new Set(),
          records: 0,
        });
      }
      const entry = byKey.get(record.nameKey);
      entry.sourcePackages.add(record.sourcePackage);
      entry.records += 1;
    });

  return [...byKey.values()].map((entry) => ({
    ...entry,
    sourcePackages: [...entry.sourcePackages].join(", "),
  }));
}

function coverageRows(kind, catalogEntries) {
  return catalogEntries.map((entry) => ({
    ...entry,
    localized: Boolean(localization.entries?.[entry.nameKey]?.cnName),
    localizationEntry: localization.entries?.[entry.nameKey] ?? null,
  }));
}

function printCoverage(kind, rows) {
  const covered = rows.filter((row) => row.localized);
  const missing = rows.filter((row) => !row.localized);

  console.log(`\n${kind} localization coverage`);
  console.log(`- localized: ${covered.length}/${rows.length}`);

  if (missing.length) {
    console.log("- missing official name keys:");
    missing.forEach((row) => {
      console.log(`  - ${row.nameKey} (${row.sourcePackages}, ${row.records} tier records)`);
    });
  }
}

const weaponRows = coverageRows(
  "weapon",
  uniqueCatalogEntries("weapon"),
);
const itemRows = coverageRows(
  "item",
  uniqueCatalogEntries("item"),
);

console.log("Brotato localization maintenance coverage");
console.log(`Catalog: ${catalogPath}`);
console.log(`Localization: ${localizationPath}`);
printCoverage("weapon", weaponRows);
printCoverage("item", itemRows);
