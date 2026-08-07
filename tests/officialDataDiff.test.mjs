import assert from "node:assert/strict";
import {
  compareOfficialDataSnapshots,
  formatOfficialDataDiff,
} from "../scripts/compare-official-data.mjs";

const files = {
  catalog: "data/official-catalog.json",
  localization: "data/official-localization.json",
  unlocks: "data/official-unlocks.json",
  effects: "data/official-effect-decoding.json",
};

function metadata(extractedAt = "2026-01-01T00:00:00.000Z") {
  return {
    extractorVersion: "extractor@1",
    extractedAt,
    productVersion: "1.0.0",
    packages: [{ id: "base", file: "Brotato.pck", sizeBytes: 10, sha256: "abc" }],
  };
}

function snapshot(extractedAt) {
  return {
    [files.catalog]: {
      sourceMetadata: metadata(extractedAt),
      records: [{ kind: "weapon", id: "weapon_smg_1", value: 10 }],
    },
    [files.localization]: {
      sourceMetadata: metadata(extractedAt),
      entries: { WEAPON_SMG: { enName: "SMG", cnName: "冲锋枪" } },
    },
    [files.unlocks]: {
      sourceMetadata: metadata(extractedAt),
      records: [{ challengeId: "chal_student", zhDescription: "达到 20 等级" }],
    },
    [files.effects]: {
      sourceMetadata: metadata(extractedAt),
      records: [{ resourcePath: "res://effect.tres", status: "pending-runtime-decode" }],
    },
  };
}

{
  const report = compareOfficialDataSnapshots(
    snapshot("2026-01-01T00:00:00.000Z"),
    snapshot("2026-02-01T00:00:00.000Z"),
  );
  assert.equal(report.hasChanges, false, "timestamp-only extraction changes should be ignored");
  assert.match(formatOfficialDataDiff(report), /No semantic official-data changes/);
}

{
  const before = snapshot();
  const after = structuredClone(before);
  after[files.catalog].records[0].value = 12;
  after[files.localization].entries.ITEM_TREE = { enName: "Tree", cnName: "树" };
  after[files.unlocks].records = [];
  after[files.effects].records[0].status = "decoded-static-parameters";
  after[files.effects].sourceMetadata.packages[0].sha256 = "def";

  const report = compareOfficialDataSnapshots(before, after);
  assert.equal(report.hasChanges, true);
  assert.deepEqual(report.datasets.find(({ label }) => label === "catalog").changed, [
    "weapon:weapon_smg_1",
  ]);
  assert.deepEqual(report.datasets.find(({ label }) => label === "localization").added, [
    "ITEM_TREE",
  ]);
  assert.deepEqual(report.datasets.find(({ label }) => label === "unlocks").removed, [
    "chal_student",
  ]);
  assert.deepEqual(report.datasets.find(({ label }) => label === "effects").metadataChanged, [
    "packages",
  ]);
  assert.match(formatOfficialDataDiff(report, "v1"), /Official data diff against v1/);
}

console.log("Official data diff tests passed");
