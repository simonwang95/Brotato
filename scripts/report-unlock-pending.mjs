import { readFileSync, writeFileSync } from "node:fs";
import { CHARACTER_GUIDES } from "../src/strategyData.js";

const unlocksPath = process.env.BROTATO_UNLOCKS_PATH || "data/official-unlocks.json";
const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const localizationPath =
  process.env.BROTATO_LOCALIZATION_PATH || "data/official-localization.json";
const outputPath =
  process.env.BROTATO_UNLOCK_PENDING_OUTPUT || "data/official-unlock-pending.json";

const unlocks = JSON.parse(readFileSync(unlocksPath, "utf8"));
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const localization = JSON.parse(readFileSync(localizationPath, "utf8"));

const UNLOCK_CHARACTER_ID_ALIASES = {
  oneArm: "oneArmed",
};

function strategyCharacterIdForUnlock(record) {
  return UNLOCK_CHARACTER_ID_ALIASES[record.characterId] ?? record.characterId;
}

function characterCatalogIdFromUnlockId(characterId) {
  return `character_${characterId.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`;
}

function officialCharacterRecord(record) {
  return (catalog.records ?? []).find(
    (entry) =>
      entry.kind === "character" && entry.id === characterCatalogIdFromUnlockId(record.characterId),
  );
}

function displayNameFromNameKey(nameKey) {
  return String(nameKey ?? "")
    .replace(/^CHARACTER_/, "")
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildPendingRecord(record) {
  const strategyId = strategyCharacterIdForUnlock(record);
  const strategyRecord = CHARACTER_GUIDES[strategyId] ?? null;
  const officialRecord = officialCharacterRecord(record);
  const localizationRecord = officialRecord
    ? localization.entries?.[officialRecord.nameKey] ?? null
    : null;
  const characterEnName =
    localizationRecord?.enName ??
    (officialRecord?.nameKey ? displayNameFromNameKey(officialRecord.nameKey) : null);

  return {
    characterId: record.characterId,
    strategyCharacterId: strategyId,
    strategyStatus: strategyRecord ? "maintained" : "official-only",
    officialNameKey: officialRecord?.nameKey ?? null,
    characterEnName,
    characterCnName: localizationRecord?.cnName ?? null,
    sourcePackage: record.sourcePackage,
    challengeId: record.challengeId,
    nameKey: record.nameKey,
    descriptionKey: record.descriptionKey,
    value: record.value,
    number: record.number,
    stat: record.stat,
    additionalArgs: record.additionalArgs,
    challengeIconPath: record.challengeIconPath ?? record.pendingEvidence?.challengeIconPath ?? null,
    challengePath: record.challengePath,
    rewardPath: record.rewardPath,
    extractionStatus: record.extractionStatus,
    pendingReason: record.pendingReason,
    verificationAction:
      "继续解码 PHashTranslation 的 key->文本映射，或用安装包/游戏内静态界面人工核验后再写入 zhDescription。",
  };
}

const records = (unlocks.records ?? [])
  .filter((record) => record.extractionStatus === "pending-text")
  .map(buildPendingRecord);

const summary = {
  total: records.length,
  bySourcePackage: records.reduce((counts, record) => {
    counts[record.sourcePackage] = (counts[record.sourcePackage] ?? 0) + 1;
    return counts;
  }, {}),
  byStrategyStatus: records.reduce((counts, record) => {
    counts[record.strategyStatus] = (counts[record.strategyStatus] ?? 0) + 1;
    return counts;
  }, {}),
};

const output = {
  generatedFrom: {
    unlocks: unlocksPath,
    catalog: catalogPath,
    localization: localizationPath,
  },
  note:
    "Pending unlock text is derived from static install-package challenge records only. This does not read save files and is not affected by local unlock progress.",
  summary,
  records,
};

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${records.length} pending unlock records to ${outputPath}`);
} else {
  console.log(JSON.stringify(summary, null, 2));
  if (records.length) {
    console.log("\nPending unlock records:");
    records.forEach((record) => {
      console.log(
        `- ${record.characterId}: ${record.challengeId} / ${record.descriptionKey}, value=${record.value}, ${record.strategyStatus}`,
      );
    });
  }
  console.log(`\nRun with --write to generate ${outputPath}`);
}
