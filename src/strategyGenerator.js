import {
  CHARACTER_GUIDES,
  DANGER_LEVELS,
  DLC_OPTIONS,
  ITEMS,
  MODES,
  PREFERENCES,
  STAT_LABELS,
  UNLOCK_OPTIONS,
  WEAPONS,
} from "./strategyData.js";
import { summarizeOfficialRecords } from "./officialCatalog.js";

export function getAvailableCharacters() {
  return Object.values(CHARACTER_GUIDES).map(({ id, name, cnHint, unlock }) => ({
    id,
    name,
    cnHint,
    unlock,
  }));
}

export function getAvailableModes() {
  return Object.values(MODES);
}

export function getAvailableDangerLevels() {
  return Object.values(DANGER_LEVELS);
}

export function getAvailableDlcOptions() {
  return Object.values(DLC_OPTIONS);
}

export function getAvailableUnlockOptions() {
  return Object.values(UNLOCK_OPTIONS);
}

export function getAvailablePreferences() {
  return Object.values(PREFERENCES).map(({ id, label }) => ({ id, label }));
}

function resolveWeapon(entry, officialCatalog) {
  const weapon = WEAPONS[entry.weaponId];
  if (!weapon) {
    throw new Error(`Unknown weapon id: ${entry.weaponId}`);
  }

  return {
    ...entry,
    weapon,
    official: summarizeOfficialRecords(officialCatalog, "weapon", weapon),
  };
}

function resolveItem(entry, officialCatalog) {
  const item = ITEMS[entry.itemId];
  if (!item) {
    throw new Error(`Unknown item id: ${entry.itemId}`);
  }

  return {
    ...entry,
    item,
    official: summarizeOfficialRecords(officialCatalog, "item", item),
  };
}

function resolveOptions(options) {
  const danger = DANGER_LEVELS[options.dangerLevelId] ?? DANGER_LEVELS.danger0;
  const dlc = DLC_OPTIONS[options.dlcOptionId] ?? DLC_OPTIONS.allowDlc;
  const unlock = UNLOCK_OPTIONS[options.unlockOptionId] ?? UNLOCK_OPTIONS.allowUnlocks;
  const preference = PREFERENCES[options.preferenceId] ?? PREFERENCES.stable;

  return {
    danger,
    dlc,
    unlock,
    preference,
  };
}

function entryAllowedByOptions(entry, options) {
  const { official } = entry;
  if (!official?.found) return true;

  if (!options.dlc.allowDlc && official.sources?.some((source) => source !== "base")) {
    return false;
  }

  if (
    !options.unlock.allowRareUnlocks &&
    official.records.some((record) => record.unlockedByDefault === false)
  ) {
    return false;
  }

  return true;
}

function preferenceScore(entry, preference) {
  const target = entry.weapon ?? entry.item;
  const haystack = [
    target.type,
    target.role,
    target.cnName,
    entry.priority,
    entry.reason,
    ...(target.tags ?? []),
  ]
    .join(" ")
    .toLowerCase();

  const keywordScore = preference.keywords.reduce(
    (score, keyword) => score + (haystack.includes(keyword.toLowerCase()) ? 2 : 0),
    0,
  );
  const tagScore = preference.tags.reduce(
    (score, tag) =>
      score + ((target.tags ?? []).some((entryTag) => entryTag.toLowerCase() === tag.toLowerCase()) ? 3 : 0),
    0,
  );
  return keywordScore + tagScore;
}

function sortByPreference(entries, preference) {
  return entries
    .map((entry, index) => ({
      entry,
      index,
      score: preferenceScore(entry, preference),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ entry }) => entry);
}

function filterAndSort(entries, options) {
  return sortByPreference(
    entries.filter((entry) => entryAllowedByOptions(entry, options)),
    options.preference,
  );
}

export function formatStatTarget(statId, range) {
  const label = STAT_LABELS[statId] ?? statId;
  if (!Array.isArray(range)) return { label, value: String(range) };
  return {
    label,
    value: `${range[0]} - ${range[1]}`,
  };
}

export function formatStatPriority(priority) {
  if (STAT_LABELS[priority]) return STAT_LABELS[priority];

  return Object.entries(STAT_LABELS).reduce(
    (label, [statId, statLabel]) => label.replaceAll(statId, statLabel),
    priority,
  );
}

function formatStatPriorities(statPriority) {
  return Object.fromEntries(
    Object.entries(statPriority).map(([phase, priorities]) => [
      phase,
      priorities.map(formatStatPriority),
    ]),
  );
}

function adjustWave20Targets(targets, danger) {
  const survivalStats = new Set(["maxHp", "armor", "dodge", "hpRegen", "lifeSteal", "speed"]);
  return Object.entries(targets).map(([statId, range]) => {
    const adjustedRange =
      Array.isArray(range) && survivalStats.has(statId)
        ? range.map((value) => Math.round(value * danger.survivabilityMultiplier))
        : range;
    return formatStatTarget(statId, adjustedRange);
  });
}

export function generateStrategyGuide(characterId, modeId = "normal20", options = {}) {
  const resolvedOptions = resolveOptions(options);
  const character = CHARACTER_GUIDES[characterId];
  if (!character) {
    throw new Error(`Unknown character id: ${characterId}`);
  }

  const mode = MODES[modeId];
  if (!mode) {
    throw new Error(`Unknown mode id: ${modeId}`);
  }

  const plan = character.plans[modeId];
  if (!plan) {
    throw new Error(`Missing ${modeId} plan for ${character.name}`);
  }

  const recommendedWeapons = filterAndSort(
    plan.recommendedWeapons.map((entry) => resolveWeapon(entry, options.officialCatalog)),
    resolvedOptions,
  );
  const keyItems = filterAndSort(
    plan.keyItems.map((entry) => resolveItem(entry, options.officialCatalog)),
    resolvedOptions,
  );

  return {
    character,
    mode,
    options: resolvedOptions,
    optionNotes: [
      resolvedOptions.danger.note,
      resolvedOptions.dlc.note,
      resolvedOptions.unlock.note,
      `偏好：${resolvedOptions.preference.label}。推荐顺序会优先贴合该路线。`,
    ],
    stance: plan.stance,
    recommendedWeapons,
    avoid: plan.avoid,
    keyItems,
    statPriority: formatStatPriorities(plan.statPriority),
    wave20Targets: adjustWave20Targets(plan.wave20Targets, resolvedOptions.danger),
    rhythm: plan.rhythm,
    sourceNotes: character.sourceNotes,
  };
}

export function validateStrategyData() {
  const errors = [];

  Object.values(CHARACTER_GUIDES).forEach((character) => {
    Object.keys(MODES).forEach((modeId) => {
      const plan = character.plans[modeId];
      if (!plan) {
        errors.push(`${character.id} is missing ${modeId} plan`);
        return;
      }

      plan.recommendedWeapons.forEach((entry) => {
        const weapon = WEAPONS[entry.weaponId];
        if (!weapon) {
          errors.push(`${character.id}/${modeId} references missing weapon ${entry.weaponId}`);
        }
        if (weapon && !weapon.cnName) {
          errors.push(`${entry.weaponId} needs a Chinese weapon name`);
        }
        if (!entry.reason) {
          errors.push(`${character.id}/${modeId}/${entry.weaponId} needs a weapon reason`);
        }
      });

      plan.keyItems.forEach((entry) => {
        const item = ITEMS[entry.itemId];
        if (!item) {
          errors.push(`${character.id}/${modeId} references missing item ${entry.itemId}`);
        }
        if (item && !item.cnName) {
          errors.push(`${entry.itemId} needs a Chinese item name`);
        }
        if (!entry.reason) {
          errors.push(`${character.id}/${modeId}/${entry.itemId} needs an item reason`);
        }
      });

      Object.values(plan.statPriority).forEach((priorities) => {
        priorities.forEach((priority) => {
          if (/[A-Za-z]/.test(formatStatPriority(priority))) {
            errors.push(`${character.id}/${modeId} priority "${priority}" needs Chinese display`);
          }
        });
      });

      Object.entries(plan.wave20Targets).forEach(([statId, range]) => {
        if (!STAT_LABELS[statId]) {
          errors.push(`${character.id}/${modeId} has unknown stat target ${statId}`);
        }
        if (
          !Array.isArray(range) ||
          range.length !== 2 ||
          !range.every((value) => Number.isFinite(value)) ||
          range[0] > range[1]
        ) {
          errors.push(`${character.id}/${modeId}/${statId} target must be [min, max]`);
        }
      });
    });
  });

  return errors;
}
