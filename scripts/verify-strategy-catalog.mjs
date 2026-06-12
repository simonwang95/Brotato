import { readFileSync } from "node:fs";
import { findOfficialRecords, getOfficialNameKey } from "../src/officialCatalog.js";
import { ITEMS, WEAPONS } from "../src/strategyData.js";

const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

function summarizeRecord(record) {
  return {
    sourcePackage: record.sourcePackage,
    tier: record.tier,
    value: record.value,
    unlockedByDefault: record.unlockedByDefault,
    canBeLooted: record.canBeLooted,
  };
}

function verifyGroup(kind, entries) {
  return Object.values(entries).map((entry) => {
    const nameKey = getOfficialNameKey(kind, entry);
    const matches = findOfficialRecords(catalog, kind, entry);

    return {
      id: entry.id,
      name: entry.name,
      cnName: entry.cnName,
      nameKey,
      matches,
    };
  });
}

const weaponResults = verifyGroup("weapon", WEAPONS);
const itemResults = verifyGroup("item", ITEMS);
const allResults = [...weaponResults, ...itemResults];
const missing = allResults.filter((result) => result.matches.length === 0);
const found = allResults.filter((result) => result.matches.length > 0);

console.log("Strategy data official-catalog verification");
console.log(`Catalog: ${catalogPath}`);
console.log(`Verified ${found.length}/${allResults.length} strategy entries.`);

if (missing.length) {
  console.log("\nMissing official catalog entries:");
  missing.forEach((result) => {
    console.log(`- ${result.name} / ${result.cnName} expected ${result.nameKey}`);
  });
}

console.log("\nResolved strategy entries:");
found.forEach((result) => {
  const first = result.matches[0];
  const tiers = result.matches.map((record) => record.tier).filter((tier) => tier !== null);
  const tierText = tiers.length ? `${Math.min(...tiers)}-${Math.max(...tiers)}` : "n/a";
  console.log(
    `- ${result.name} / ${result.cnName} -> ${result.nameKey} source=${first.sourcePackage} tiers=${tierText} first=${JSON.stringify(
      summarizeRecord(first),
    )}`,
  );
});

if (missing.length) process.exit(1);
