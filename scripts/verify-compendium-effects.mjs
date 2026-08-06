import { existsSync, readFileSync } from "node:fs";
import { buildCompendium, formatEffectDetail } from "../src/compendium.js";

const catalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const localization = JSON.parse(readFileSync("data/official-localization.json", "utf8"));
const unlocks = JSON.parse(readFileSync("data/official-unlocks.json", "utf8"));
const decodingPath = "data/official-effect-decoding.json";
const decoding = existsSync(decodingPath)
  ? JSON.parse(readFileSync(decodingPath, "utf8"))
  : { records: [] };
const compendium = buildCompendium(catalog, localization, unlocks);
const internalArtifactPattern =
  /\.gd\b|res:\/\/|\b(?:effect|item|stat|enemy|weapon)_[a-z0-9_]+\b|\[EMPTY\]|未解析|官方自定义收益|未知属性/i;

const issues = [];
let renderedLineCount = 0;
const decodingIndex = new Map(
  (decoding.records ?? []).map((record) => [
    `${record.kind}:${record.recordId}:${record.resourcePath}`,
    record,
  ]),
);

for (const record of decoding.records ?? []) {
  const catalogRecord = (catalog.records ?? []).find(
    (candidate) => candidate.id === record.recordId && candidate.kind === record.kind,
  );
  const effect = catalogRecord?.effects?.find((candidate) => candidate.path === record.resourcePath);
  if (!catalogRecord || !effect) {
    issues.push(`decoding manifest entry is stale: ${record.kind}:${record.nameKey}:${record.resourcePath}`);
  }
  if (!record.resourcePath || !record.effectKey || !record.impactScope) {
    issues.push(`decoding manifest entry is incomplete: ${record.kind}:${record.nameKey}`);
  }
  if (effect && record.displayText !== formatEffectDetail(effect)) {
    issues.push(`decoding manifest display text is stale: ${record.kind}:${record.nameKey}:${record.resourcePath}`);
  }
}

for (const catalogRecord of catalog.records ?? []) {
  for (const effect of catalogRecord.effects ?? []) {
    const displayText = formatEffectDetail(effect);
    if (!/待解码|未知/.test(displayText)) continue;
    const key = `${catalogRecord.kind}:${catalogRecord.id}:${effect.path}`;
    if (!decodingIndex.has(key)) {
      issues.push(
        `pending display effect is missing from decoding manifest: ${catalogRecord.kind}:${catalogRecord.nameKey}:${effect.path}`,
      );
    }
  }
}

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
console.log(`Checked ${decoding.records?.length ?? 0} effect decoding manifest entries.`);

if (issues.length) {
  console.error("\nIssues:");
  issues.forEach((issue) => console.error(`- ${issue}`));
  process.exit(1);
}

console.log("All catalog effects use readable display text.");
