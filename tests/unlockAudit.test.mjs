import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const output = execFileSync("node", ["scripts/verify-unlocks.mjs"], {
  encoding: "utf8",
});
const warningsSection = output.split("\nAudited catalog gaps:")[0] ?? output;

assert.match(
  output,
  /Static unlock records: 54; unmaintained in strategy layer: 0\./,
  "unlock verifier should report every official unlock record as maintained",
);
assert.match(
  output,
  /Unmaintained unlock detail: verified-static-text 0, pending-text 0, other 0\./,
  "unlock verifier should keep the unmaintained unlock count empty",
);
assert.match(
  output,
  /Audited character catalog gaps: 1\./,
  "unlock verifier should count audited strategy-only catalog gaps separately",
);
assert.doesNotMatch(
  warningsSection,
  /Warnings:[\s\S]*character:giant/,
  "audited Giant catalog gap should not be reported as an unlock warning",
);
assert.match(
  output,
  /Audited catalog gaps:[\s\S]*character:giant Giant .*CHARACTER_GIANT/,
  "audited Giant catalog gap should remain visible in the verifier report",
);
assert.doesNotMatch(
  output,
  /official-unlock:oneArm /,
  "oneArm static unlock should map to the maintained oneArmed strategy id",
);
assert.match(
  output,
  /Checked 44 weapons, 49 items, 65 characters\./,
  "unlock verifier should include the maintained Beast Master and Wounded guides",
);
assert.match(
  output,
  /Unlock states are consistent with the official catalog\./,
  "unlock verifier should pass after maintaining Beast Master and Wounded",
);
assert.doesNotMatch(
  output,
  /official-unlock:(?:beastMaster|wounded)/,
  "maintained official unlock records should not remain warnings",
);
assert.doesNotMatch(
  output,
  /official-unlock:vampire .*CHARACTER_VAMPIRE.*CHAL_STAT_DESC/,
  "vampire has verified static unlock text and should now be maintained in strategy data",
);

console.log("unlock audit tests passed");
