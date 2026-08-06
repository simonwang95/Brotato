import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.env.BROTATO_UNLOCKS_PATH || "data/official-unlocks.json";
const outputPath = process.env.BROTATO_UNLOCKS_MODULE_OUTPUT || "src/officialUnlocks.js";
const unlocks = JSON.parse(readFileSync(inputPath, "utf8"));
const aliases = { oneArm: "oneArmed" };
function displayText(record) {
  const description = record.zhDescription
    .replace(/(\d+)%?/g, (match, value) => `${match.endsWith("%") ? `${value}%` : value}`)
    .replace(/(\d+)(?=[\u4e00-\u9fff])/g, "$1 ")
    .replace(/([\u4e00-\u9fff])(\d+)/g, "$1 $2")
    .replace(/%(?=[\u4e00-\u9fff])/g, "% ")
    .replace(/\s+/g, " ")
    .trim();
  return `官方静态数据：${description}。`;
}
const entries = Object.fromEntries(
  (unlocks.records ?? [])
    .filter((record) => record.zhDescription && record.extractionStatus === "verified-static-text")
    .map((record) => [aliases[record.characterId] ?? record.characterId, displayText(record)]),
);

const moduleText = `// Generated from ${inputPath}; do not hand-edit the unlock text.\nexport const OFFICIAL_CHARACTER_UNLOCKS = ${JSON.stringify(entries, null, 2)};\n`;
writeFileSync(outputPath, moduleText);
console.log(`Wrote ${Object.keys(entries).length} verified unlock texts to ${outputPath}`);
