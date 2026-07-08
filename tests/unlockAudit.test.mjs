import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";

const output = execFileSync("node", ["scripts/verify-unlocks.mjs"], {
  encoding: "utf8",
});
const warningsSection = output.split("\nAudited catalog gaps:")[0] ?? output;

assert.match(
  output,
  /Static unlock records: 54; unmaintained in strategy layer: 2\./,
  "unlock verifier should report official unlock records missing from strategy data",
);
assert.match(
  output,
  /Unmaintained unlock detail: verified-static-text 0, pending-text 2, other 0\./,
  "unlock verifier should prove no verified static unlock text remains unmaintained",
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
  /official-unlock:beastMaster .*CHARACTER_BEAST_MASTER.*CHAL_PAWS_N_CLAWS_DESC/,
  "beast master static unlock evidence should not be hidden",
);
assert.match(
  output,
  /official-unlock:wounded .*CHARACTER_WOUNDED.*CHAL_DIFFICULTY_NIGHTMARE_1_DESC/,
  "wounded static unlock evidence should not be hidden",
);
assert.doesNotMatch(
  output,
  /official-unlock:vampire .*CHARACTER_VAMPIRE.*CHAL_STAT_DESC/,
  "vampire has verified static unlock text and should now be maintained in strategy data",
);

console.log("unlock audit tests passed");
