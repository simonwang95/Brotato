import { readFileSync } from "node:fs";
import { getOfficialNameKey } from "../src/officialCatalog.js";
import { ITEMS, WEAPONS } from "../src/strategyData.js";

const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

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

function maintainedEntries(kind, entries) {
  return new Map(
    Object.values(entries).map((entry) => [
      getOfficialNameKey(kind, entry),
      {
        id: entry.id,
        name: entry.name,
        cnName: entry.cnName,
      },
    ]),
  );
}

function coverageRows(kind, catalogEntries, maintained) {
  return catalogEntries.map((entry) => ({
    ...entry,
    maintained: maintained.has(entry.nameKey),
    maintainedEntry: maintained.get(entry.nameKey) ?? null,
  }));
}

function printCoverage(kind, rows) {
  const covered = rows.filter((row) => row.maintained);
  const missing = rows.filter((row) => !row.maintained);

  console.log(`\n${kind} localization coverage`);
  console.log(`- maintained: ${covered.length}/${rows.length}`);

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
  maintainedEntries("weapon", WEAPONS),
);
const itemRows = coverageRows(
  "item",
  uniqueCatalogEntries("item"),
  maintainedEntries("item", ITEMS),
);

console.log("Brotato localization maintenance coverage");
console.log(`Catalog: ${catalogPath}`);
printCoverage("weapon", weaponRows);
printCoverage("item", itemRows);
