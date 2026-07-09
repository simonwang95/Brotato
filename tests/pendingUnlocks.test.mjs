import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const unlocks = JSON.parse(readFileSync("data/official-unlocks.json", "utf8"));
const pending = JSON.parse(readFileSync("data/official-unlock-pending.json", "utf8"));

const sourcePendingRecords = unlocks.records.filter(
  (record) => record.extractionStatus === "pending-text",
);

assert.equal(
  pending.summary.total,
  sourcePendingRecords.length,
  "pending unlock list should mirror official-unlocks pending-text records",
);
assert.deepEqual(pending.summary.bySourcePackage, { base: 2, abyssalTerrors: 8 });
assert.deepEqual(pending.summary.byStrategyStatus, { "official-only": 2, maintained: 8 });
assert.match(
  pending.note,
  /does not read save files and is not affected by local unlock progress/,
  "pending unlock list should make the static-data boundary explicit",
);

{
  const chef = pending.records.find((record) => record.characterId === "chef");
  assert.equal(chef?.strategyStatus, "maintained");
  assert.equal(chef?.officialNameKey, "CHARACTER_CHEF");
  assert.equal(chef?.characterCnName, "厨师");
  assert.equal(chef?.descriptionKey, "CHAL_BARBECUE_DESC");
  assert.equal(chef?.value, 25);
  assert.equal(chef?.challengeIconPath, "res://items/all/campfire/campfire_icon.png");
  assert.match(chef?.verificationAction ?? "", /PHashTranslation/);
}

{
  const beastMaster = pending.records.find((record) => record.characterId === "beastMaster");
  assert.equal(beastMaster?.strategyStatus, "official-only");
  assert.equal(beastMaster?.officialNameKey, "CHARACTER_BEAST_MASTER");
  assert.equal(beastMaster?.descriptionKey, "CHAL_PAWS_N_CLAWS_DESC");
  assert.equal(beastMaster?.challengeIconPath, "res://items/challenges/beast_master_challenge.png");
}

const report = execFileSync("node", ["scripts/report-unlock-pending.mjs"], {
  encoding: "utf8",
});
assert.match(report, /"total": 10/);
assert.doesNotMatch(report, /buccaneer: chal_blind_greed/);
assert.match(report, /chef: chal_barbecue \/ CHAL_BARBECUE_DESC, value=25, maintained/);

console.log("pending unlock tests passed");
