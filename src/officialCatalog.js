export function toOfficialNameKey(prefix, name) {
  return `${prefix}_${name
    .replace(/’/g, "")
    .replace(/'/g, "")
    .replace(/[^A-Za-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toUpperCase()}`;
}

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
  if (sourcePackage === "base") return "原版";
  if (sourcePackage === "abyssalTerrors") return "深渊惊魂";
  return sourcePackage;
}

export function getOfficialNameKey(kind, entry) {
  const prefix = kind === "weapon" ? "WEAPON" : "ITEM";
  return entry.officialNameKey ?? toOfficialNameKey(prefix, entry.name);
}

export function findOfficialRecords(catalog, kind, entry) {
  if (!catalog?.records) return [];

  const nameKey = getOfficialNameKey(kind, entry);
  return catalog.records.filter((record) => record.kind === kind && record.nameKey === nameKey);
}

export function summarizeOfficialRecords(catalog, kind, entry) {
  const nameKey = getOfficialNameKey(kind, entry);
  const records = findOfficialRecords(catalog, kind, entry);
  if (!records.length) {
    return {
      nameKey,
      found: false,
      records: [],
      display: "官方目录未匹配",
    };
  }

  const sources = unique(records.map((record) => record.sourcePackage));
  const unlockedValues = unique(records.map((record) => record.unlockedByDefault));
  const lootValues = unique(records.map((record) => record.canBeLooted));
  const tierLabel = rangeLabel(records.map((record) => record.tier), (tier) => `T${tier + 1}`);
  const valueLabel = rangeLabel(records.map((record) => record.value));

  const unlockedLabel =
    unlockedValues.length === 1
      ? unlockedValues[0]
        ? "默认解锁"
        : "需解锁"
      : "解锁状态混合";
  const lootLabel =
    lootValues.length === 1 ? (lootValues[0] ? "可掉落" : "不进掉落池") : "掉落状态混合";

  return {
    nameKey,
    found: true,
    records,
    sources,
    sourceLabel: sources.map(sourceLabel).join(" / "),
    tierLabel,
    valueLabel,
    unlockedLabel,
    lootLabel,
    display: `${sources.map(sourceLabel).join(" / ")}，${tierLabel}，价格 ${valueLabel}，${unlockedLabel}，${lootLabel}`,
  };
}
