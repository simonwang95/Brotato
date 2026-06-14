import { CHARACTER_GUIDES, ITEMS, WEAPONS } from "./strategyData.js";
import { getOfficialNameKey } from "./officialCatalog.js";

const SOURCE_LABELS = {
  base: "原版",
  abyssalTerrors: "深海魔怪",
};

const SET_LABELS = {
  blade: "刀刃",
  blunt: "钝器",
  elemental: "元素",
  ethereal: "幽魂",
  explosive: "爆炸",
  gun: "枪械",
  heavy: "重型",
  legendary: "传奇",
  medical: "医疗",
  medieval: "中世纪",
  musical: "乐器",
  precise: "精准",
  primitive: "原始",
  support: "支援",
  tool: "工具",
  unarmed: "徒手",
};

function unique(values) {
  return [...new Set(values.filter((value) => value !== null && value !== undefined))];
}

function rangeLabel(values, format = (value) => String(value)) {
  const cleanValues = unique(values).filter((value) => Number.isFinite(value));
  if (!cleanValues.length) return "未知";

  const min = Math.min(...cleanValues);
  const max = Math.max(...cleanValues);
  return min === max ? format(min) : `${format(min)}-${format(max)}`;
}

function sourceLabel(sourcePackage) {
  return SOURCE_LABELS[sourcePackage] ?? sourcePackage ?? "未知来源";
}

function boolStateLabel(values, yesLabel, noLabel, mixedLabel, unknownLabel = "未知") {
  const cleanValues = unique(values).filter((value) => typeof value === "boolean");
  if (!cleanValues.length) return unknownLabel;
  if (cleanValues.length > 1) return mixedLabel;
  return cleanValues[0] ? yesLabel : noLabel;
}

function setIdFromPath(path) {
  const match = String(path).match(/sets\/([^/]+)\//);
  return match?.[1] ?? null;
}

function splitChineseHint(cnHint) {
  const [cnName = "", ...rest] = String(cnHint).split("，");
  return {
    cnName,
    archetype: rest.join("，"),
  };
}

function buildStrategyIndex(kind, entries) {
  return Object.values(entries).reduce((index, entry) => {
    index.set(getOfficialNameKey(kind, entry), entry);
    return index;
  }, new Map());
}

function groupCatalogRecords(catalog, kind) {
  return (catalog?.records ?? [])
    .filter((record) => record.kind === kind)
    .reduce((groups, record) => {
      if (!groups.has(record.nameKey)) groups.set(record.nameKey, []);
      groups.get(record.nameKey).push(record);
      return groups;
    }, new Map());
}

function summarizeCatalogRecordGroup(nameKey, records, localization, strategyEntry) {
  const localized = localization?.entries?.[nameKey];
  const sources = unique(records.map((record) => record.sourcePackage));
  const setIds = unique(records.flatMap((record) => record.setPaths ?? []).map(setIdFromPath));
  const effectPaths = unique(records.flatMap((record) => record.effectPaths ?? []));
  const cursedValues = unique(records.map((record) => record.isCursed));

  return {
    id: nameKey,
    nameKey,
    enName: localized?.enName ?? strategyEntry?.name ?? nameKey,
    cnName: localized?.cnName ?? strategyEntry?.cnName ?? "待本地化",
    localizationSource: localized?.source ?? "missing",
    sourcePackages: sources,
    sourceLabel: sources.map(sourceLabel).join(" / "),
    tierLabel: rangeLabel(records.map((record) => record.tier), (tier) => `T${tier + 1}`),
    valueLabel: rangeLabel(records.map((record) => record.value), (value) => `${value}`),
    unlockLabel: boolStateLabel(
      records.map((record) => record.unlockedByDefault),
      "默认解锁",
      "需解锁",
      "解锁状态混合",
    ),
    lootLabel: boolStateLabel(
      records.map((record) => record.canBeLooted),
      "可掉落",
      "不进掉落池",
      "掉落状态混合",
      "掉落状态未知",
    ),
    setLabels: setIds.map((setId) => SET_LABELS[setId] ?? setId),
    effectCount: effectPaths.length,
    recordCount: records.length,
    isCursedLabel: boolStateLabel(cursedValues, "可诅咒", "普通", "诅咒状态混合", "诅咒状态未知"),
    curseFactorLabel: rangeLabel(records.map((record) => record.curseFactor)),
    strategyEntry,
    strategyUnlock: strategyEntry?.unlock ?? "未在策略层维护具体条件",
    strategyStatNote: strategyEntry?.statNote ?? strategyEntry?.role ?? strategyEntry?.type ?? "",
    strategyType: strategyEntry?.type ?? strategyEntry?.role ?? "",
    strategyTags: strategyEntry?.tags ?? [],
  };
}

export function buildCharacterCompendium() {
  return Object.values(CHARACTER_GUIDES)
    .map((character) => {
      const { cnName, archetype } = splitChineseHint(character.cnHint);
      const unlockVerified = !/待校验|待补/.test(character.unlock);

      return {
        id: character.id,
        name: character.name,
        cnName,
        archetype,
        unlock: character.unlock,
        unlockStatus: unlockVerified ? "已维护条件" : "待补精确条件",
        summary: character.summary,
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name, "en"));
}

export function buildCatalogCompendium(catalog, localization, kind, strategyEntries) {
  const groups = groupCatalogRecords(catalog, kind);
  const strategyIndex = buildStrategyIndex(kind, strategyEntries);

  return [...groups.entries()]
    .map(([nameKey, records]) =>
      summarizeCatalogRecordGroup(nameKey, records, localization, strategyIndex.get(nameKey)),
    )
    .sort((left, right) => {
      const sourceCompare = left.sourceLabel.localeCompare(right.sourceLabel, "zh-CN");
      if (sourceCompare !== 0) return sourceCompare;
      return left.cnName.localeCompare(right.cnName, "zh-CN");
    });
}

export function buildCompendium(catalog, localization) {
  return {
    characters: buildCharacterCompendium(),
    weapons: buildCatalogCompendium(catalog, localization, "weapon", WEAPONS),
    items: buildCatalogCompendium(catalog, localization, "item", ITEMS),
  };
}
