import { existsSync, readFileSync } from "node:fs";
import { findOfficialRecords, getOfficialNameKey, toOfficialNameKey } from "../src/officialCatalog.js";
import { CHARACTER_GUIDES, ITEMS, WEAPONS } from "../src/strategyData.js";

const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const unlocksPath = process.env.BROTATO_UNLOCKS_PATH || "data/official-unlocks.json";
const catalogGapsPath =
  process.env.BROTATO_CHARACTER_CATALOG_GAPS_PATH ||
  "data/official-character-catalog-gaps.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const unlocks = existsSync(unlocksPath)
  ? JSON.parse(readFileSync(unlocksPath, "utf8"))
  : { records: [] };
const catalogGaps = existsSync(catalogGapsPath)
  ? JSON.parse(readFileSync(catalogGapsPath, "utf8"))
  : { records: [] };
const unlockRecordsByCharacterId = new Map(
  (unlocks.records ?? []).map((record) => [record.characterId, record]),
);
const catalogGapByCharacterId = new Map(
  (catalogGaps.records ?? []).map((record) => [record.characterId, record]),
);

const CHARACTER_NAME_KEY_OVERRIDES = {
  oneArmed: "CHARACTER_ONE_ARM",
};

const UNLOCK_CHARACTER_ID_ALIASES = {
  oneArm: "oneArmed",
};

const strategyCharacterIds = new Set(Object.keys(CHARACTER_GUIDES));

function strategyCharacterIdForUnlock(record) {
  return UNLOCK_CHARACTER_ID_ALIASES[record.characterId] ?? record.characterId;
}

function characterCatalogIdFromUnlockId(characterId) {
  return `character_${characterId.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)}`;
}

function unmaintainedUnlockRecords() {
  return (unlocks.records ?? []).filter(
    (record) => !strategyCharacterIds.has(strategyCharacterIdForUnlock(record)),
  );
}

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

function characterNameKey(character) {
  return CHARACTER_NAME_KEY_OVERRIDES[character.id] ?? toOfficialNameKey("CHARACTER", character.name);
}

function officialState(records, field) {
  const values = unique(records.map((record) => record[field])).filter(
    (value) => typeof value === "boolean",
  );
  if (!values.length) return "unknown";
  if (values.length > 1) return "mixed";
  return values[0] ? "yes" : "no";
}

function textClaimsDefault(text) {
  return /默认|无需解锁|默认池/.test(text);
}

function textClaimsLocked(text) {
  return /需解锁|通关|赢得一局|收集|同时|挑战|待校验/.test(text);
}

function textClaimsLootable(text) {
  return /可掉落/.test(text);
}

function textClaimsUnlootable(text) {
  return /不进掉落池|不可掉落/.test(text);
}

function validateEntry(kind, entry) {
  const records = findOfficialRecords(catalog, kind, entry);
  const label = `${kind}:${entry.id} ${entry.name} / ${entry.cnName}`;
  const errors = [];
  const warnings = [];

  if (!records.length) {
    errors.push(`${label} 未匹配官方目录 ${getOfficialNameKey(kind, entry)}`);
    return { errors, warnings };
  }

  const unlockState = officialState(records, "unlockedByDefault");
  const lootState = officialState(records, "canBeLooted");
  const unlock = entry.unlock ?? "";

  if (unlockState === "yes" && textClaimsLocked(unlock) && !textClaimsDefault(unlock)) {
    errors.push(`${label} 官方为默认解锁，但策略文案写成：${unlock}`);
  }
  if (unlockState === "no" && textClaimsDefault(unlock) && !textClaimsLocked(unlock)) {
    errors.push(`${label} 官方为需解锁，但策略文案写成：${unlock}`);
  }
  if (lootState === "yes" && textClaimsUnlootable(unlock)) {
    errors.push(`${label} 官方可掉落，但策略文案写成：${unlock}`);
  }
  if (lootState === "no" && textClaimsLootable(unlock)) {
    errors.push(`${label} 官方不进掉落池，但策略文案写成：${unlock}`);
  }
  if (lootState === "unknown" && textClaimsLootable(unlock)) {
    warnings.push(`${label} 官方掉落状态未知，策略文案写成：${unlock}`);
  }

  return { errors, warnings };
}

function validateCharacter(character) {
  const nameKey = characterNameKey(character);
  const record = (catalog.records ?? []).find(
    (entry) => entry.kind === "character" && entry.nameKey === nameKey,
  );
  const label = `character:${character.id} ${character.name}`;
  const errors = [];
  const warnings = [];
  const catalogGapNotices = [];

  if (!record) {
    const knownGap = catalogGapByCharacterId.get(character.id);
    if (knownGap) {
      catalogGapNotices.push(
        `${label} 已审计官方目录缺口：${knownGap.expectedNameKey}；${knownGap.reason}`,
      );
      return { errors, warnings, catalogGapNotices };
    }
    warnings.push(`${label} 未匹配官方角色目录 ${nameKey}`);
    return { errors, warnings, catalogGapNotices };
  }

  const unlock = character.unlock ?? "";
  if (record.unlockedByDefault === true && textClaimsLocked(unlock) && !textClaimsDefault(unlock)) {
    errors.push(`${label} 官方为默认角色，但攻略文案写成：${unlock}`);
  }
  if (record.unlockedByDefault === false && textClaimsDefault(unlock) && !textClaimsLocked(unlock)) {
    errors.push(`${label} 官方为需解锁角色，但攻略文案写成：${unlock}`);
  }

  if (/待校验|待补/.test(unlock)) {
    const unlockRecord = unlockRecordsByCharacterId.get(character.id);
    const evidence = unlockRecord
      ? `；静态挑战 ${unlockRecord.challengeId} / ${unlockRecord.descriptionKey}，value=${unlockRecord.value}${unlockRecord.pendingReason ? `；${unlockRecord.pendingReason}` : ""}`
      : "";
    warnings.push(`${label} 仍缺精确挑战条件：${unlock.replace(/[。.]$/, "")}${evidence}`);
  }

  return { errors, warnings, catalogGapNotices };
}

function auditUnmaintainedUnlockRecord(record) {
  if (strategyCharacterIds.has(strategyCharacterIdForUnlock(record))) return null;

  const catalogRecord = (catalog.records ?? []).find(
    (entry) =>
      entry.kind === "character" && entry.id === characterCatalogIdFromUnlockId(record.characterId),
  );
  const officialKey = catalogRecord?.nameKey ?? "未匹配官方角色目录";
  const pendingReason = record.pendingReason ? `；${record.pendingReason}` : "";

  return {
    errors: [],
    warnings: [
      `official-unlock:${record.characterId} 官方静态解锁记录未进入策略层；官方角色 ${officialKey}；静态挑战 ${record.challengeId} / ${record.descriptionKey}，value=${record.value}${pendingReason}`,
    ],
  };
}

const results = [
  ...Object.values(WEAPONS).map((entry) => validateEntry("weapon", entry)),
  ...Object.values(ITEMS).map((entry) => validateEntry("item", entry)),
  ...Object.values(CHARACTER_GUIDES).map(validateCharacter),
  ...(unlocks.records ?? []).map(auditUnmaintainedUnlockRecord).filter(Boolean),
];

const errors = results.flatMap((result) => result.errors);
const warnings = results.flatMap((result) => result.warnings);
const catalogGapNotices = results.flatMap((result) => result.catalogGapNotices ?? []);
const officialWeaponCandidateCount = unique(
  (catalog.records ?? [])
    .filter((record) => record.kind === "weapon")
    .map((record) => record.nameKey),
).length;
const officialItemCandidateCount = unique(
  (catalog.records ?? [])
    .filter((record) => record.kind === "item")
    .map((record) => record.nameKey),
).length;

console.log("Brotato unlock verification");
console.log(`Catalog: ${catalogPath}`);
console.log(`Unlocks: ${unlocksPath}`);
console.log(`Checked ${Object.keys(WEAPONS).length} weapons, ${Object.keys(ITEMS).length} items, ${Object.keys(CHARACTER_GUIDES).length} characters.`);
console.log(`Audited character catalog gaps: ${catalogGapNotices.length}.`);
console.log(
  `Static unlock records: ${(unlocks.records ?? []).length}; unmaintained in strategy layer: ${unmaintainedUnlockRecords().length}.`,
);
console.log(
  `Official recommendation candidate pool: ${officialWeaponCandidateCount} weapons, ${officialItemCandidateCount} items.`,
);

if (warnings.length) {
  console.log("\nWarnings:");
  warnings.forEach((warning) => console.log(`- ${warning}`));
}

if (catalogGapNotices.length) {
  console.log("\nAudited catalog gaps:");
  catalogGapNotices.forEach((notice) => console.log(`- ${notice}`));
}

if (errors.length) {
  console.log("\nErrors:");
  errors.forEach((error) => console.log(`- ${error}`));
  process.exit(1);
}

console.log("\nUnlock states are consistent with the official catalog.");
