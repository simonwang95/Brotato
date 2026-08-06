import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { formatEffectDetail } from "../src/compendium.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const manifest = JSON.parse(readFileSync("data/official-effect-decoding.json", "utf8"));

assert.equal(manifest.summary.total, manifest.records.length);
assert.ok(manifest.summary.byGroup["pet-static-parameters"] >= 9);
assert.ok(manifest.summary.byGroup["giant-belt"] >= 1);
assert.ok(manifest.summary.byStatus["pending-runtime-decode"] >= 1);

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
assert.equal(giantBelt?.status, "pending-runtime-decode");
assert.equal(giantBelt?.effectKey, "giant_crit_damage");
assert.match(giantBelt?.impactScope ?? "", /未证明/);

const javelinSubEffect = manifest.records.find(
  (record) => record.nameKey === "WEAPON_JAVELIN" && record.group === "periodic-sub-effect",
);
assert.ok(javelinSubEffect, "Javelin pending sub-effect should be classified in the manifest");
assert.match(javelinSubEffect.displayText, /强化参数待解码/);

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
