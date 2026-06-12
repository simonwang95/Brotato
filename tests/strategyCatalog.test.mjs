import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findOfficialRecords, getOfficialNameKey } from "../src/officialCatalog.js";
import { ITEMS, WEAPONS } from "../src/strategyData.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));

function expectCatalogEntries(kind, entries) {
  Object.values(entries).forEach((entry) => {
    const expectedNameKey = getOfficialNameKey(kind, entry);
    const matches = findOfficialRecords(catalog, kind, entry);
    assert.ok(matches.length > 0, `${entry.name} should map to ${expectedNameKey}`);
  });
}

expectCatalogEntries("weapon", WEAPONS);
expectCatalogEntries("item", ITEMS);

console.log("strategy catalog tests passed");
