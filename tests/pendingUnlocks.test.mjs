import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const unlocks = JSON.parse(readFileSync("data/official-unlocks.json", "utf8"));
const pending = JSON.parse(readFileSync("data/official-unlock-pending.json", "utf8"));

assert.equal(unlocks.sourceMetadata.productVersion, "1.1.12.0.beta-3");
assert.equal(unlocks.sourceMetadata.packages.length, 2);

const sourcePendingRecords = unlocks.records.filter(
  (record) => record.extractionStatus === "pending-text",
);

assert.equal(
  pending.summary.total,
  sourcePendingRecords.length,
  "pending unlock list should mirror official-unlocks pending-text records",
);
assert.equal(pending.summary.total, 0);
assert.deepEqual(pending.summary.bySourcePackage, {});
assert.deepEqual(pending.summary.byStrategyStatus, {});
assert.deepEqual(pending.records, []);
assert.match(
  pending.note,
  /does not read save files and is not affected by local unlock progress/,
  "pending unlock list should make the static-data boundary explicit",
);

const report = execFileSync("node", ["scripts/report-unlock-pending.mjs"], {
  encoding: "utf8",
});
assert.match(report, /"total": 0/);
assert.doesNotMatch(report, /chef:|beastMaster:|buccaneer:/);

console.log("pending unlock tests passed");
