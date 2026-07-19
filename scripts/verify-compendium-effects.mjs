import { readFileSync } from "node:fs";
import { buildCompendium } from "../src/compendium.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));
const unlocks = JSON.parse(readFileSync("data/official-unlocks.json", "utf8"));
const compendium = buildCompendium(catalog, localization, unlocks);
const internalArtifactPattern =
  /\.gd\b|res:\/\/|\b(?:effect|item|stat|enemy|weapon)_[a-z0-9_]+\b|\[EMPTY\]|未解析|官方自定义收益|未知属性/i;

const issues = [];
let renderedLineCount = 0;

for (const [kind, entries] of [
  ["weapon", compendium.weapons],
  ["item", compendium.items],
]) {
  for (const entry of entries) {
    const lines = [...(entry.detailedAttributes ?? []), ...(entry.tierEffectLines ?? [])];
    renderedLineCount += lines.length;

    for (const line of lines) {
      if (internalArtifactPattern.test(line)) {
        issues.push(`${kind}:${entry.nameKey} exposes internal text: ${line}`);
      }
      if (/^T\d+\s*$/.test(line)) {
        issues.push(`${kind}:${entry.nameKey} renders an empty tier effect`);
      }
    }
  }
}

console.log("Brotato compendium effect verification");
console.log(`Checked ${compendium.weapons.length} weapons and ${compendium.items.length} items.`);
console.log(`Checked ${renderedLineCount} rendered attribute/effect lines.`);

if (issues.length) {
  console.error("\nIssues:");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log("All catalog effects use readable display text.");
