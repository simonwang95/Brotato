import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { ITEMS, WEAPONS } from "../src/strategyData.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));

function toNameKey(prefix, name) {
  return `${prefix}_${name
    .replace(/’/g, "")
    .replace(/'/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()}`;
}

function expectCatalogEntries(kind, entries, prefix) {
  Object.values(entries).forEach((entry) => {
    const nameKey = toNameKey(prefix, entry.name);
    const expectedNameKey = entry.officialNameKey ?? nameKey;
    const matches = catalog.records.filter(
      (record) => record.kind === kind && record.nameKey === expectedNameKey,
    );
    assert.ok(matches.length > 0, `${entry.name} should map to ${expectedNameKey}`);
  });
}

expectCatalogEntries("weapon", WEAPONS, "WEAPON");
expectCatalogEntries("item", ITEMS, "ITEM");

console.log("strategy catalog tests passed");
