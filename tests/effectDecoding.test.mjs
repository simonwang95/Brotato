import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatEffectDetail } from "../src/compendium.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const manifest = JSON.parse(readFileSync("data/official-effect-decoding.json", "utf8"));

assert.equal(manifest.summary.total, manifest.records.length);
assert.ok(manifest.summary.byGroup["pet-static-parameters"] >= 9);
assert.ok(manifest.summary.byGroup["giant-belt"] >= 1);
assert.ok(manifest.summary.byStatus["pending-runtime-decode"] >= 1);
assert.equal(
  manifest.summary.byStatus["pending-runtime-decode"],
  14,
  "only effects without a stable static interpretation should remain runtime-pending",
);
assert.equal(
  manifest.summary.byGroup["unclassified-runtime-effect"],
  3,
  "new pending display effects must be deliberately classified",
);

for (const record of manifest.records) {
  const catalogRecord = catalog.records.find(
    (candidate) => candidate.id === record.recordId && candidate.kind === record.kind,
  );
  assert.ok(catalogRecord, `manifest record ${record.recordId} should exist in catalog`);
  assert.ok(
    catalogRecord.effects.some((effect) => effect.path === record.resourcePath),
    `manifest resource ${record.resourcePath} should exist in catalog`,
  );
  assert.ok(record.impactScope);
}

const giantBelt = manifest.records.find((record) => record.group === "giant-belt");
assert.equal(giantBelt?.status, "decoded-static-parameters");
assert.equal(giantBelt?.effectKey, "giant_crit_damage");
assert.equal(giantBelt?.effectParameters.value2, 1);
assert.match(giantBelt?.displayText ?? "", /当前生命 10%.*Boss 和精英按 1%/);

const javelinSubEffect = manifest.records.find(
  (record) => record.nameKey === "WEAPON_JAVELIN" && record.group === "periodic-sub-effect",
);
assert.ok(javelinSubEffect, "Javelin sub-effect should be classified in the manifest");
assert.equal(javelinSubEffect.status, "decoded-static-parameters");
assert.equal(javelinSubEffect.subEffects[0]?.key, "stat_crit_chance");
assert.match(javelinSubEffect.displayText, /第 5 个投射物.*暴击率 \+100%/);

const breakOnHit = manifest.records.find((record) => record.effectKey === "break_on_hit");
assert.equal(breakOnHit?.group, "break-on-hit");
assert.notEqual(breakOnHit?.group, "high-low-health-threshold");

const manifestKeys = new Set(
  manifest.records.map((record) => `${record.kind}:${record.recordId}:${record.resourcePath}`),
);
for (const catalogRecord of catalog.records) {
  for (const effect of catalogRecord.effects ?? []) {
    if (!/待解码|未知/.test(formatEffectDetail(effect))) continue;
    assert.ok(
      manifestKeys.has(`${catalogRecord.kind}:${catalogRecord.id}:${effect.path}`),
      `${catalogRecord.nameKey}:${effect.path} pending display should be tracked`,
    );
  }
}

console.log("effect decoding tests passed");
