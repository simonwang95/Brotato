import { CHARACTER_GUIDES, ITEMS, MODES, STAT_LABELS, WEAPONS } from "./strategyData.js";

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

function resolveWeapon(entry) {
  const weapon = WEAPONS[entry.weaponId];
  if (!weapon) {
    throw new Error(`Unknown weapon id: ${entry.weaponId}`);
  }

  return {
    ...entry,
    weapon,
  };
}

function resolveItem(entry) {
  const item = ITEMS[entry.itemId];
  if (!item) {
    throw new Error(`Unknown item id: ${entry.itemId}`);
  }

  return {
    ...entry,
    item,
  };
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

export function generateStrategyGuide(characterId, modeId = "normal20") {
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

  return {
    character,
    mode,
    stance: plan.stance,
    recommendedWeapons: plan.recommendedWeapons.map(resolveWeapon),
    avoid: plan.avoid,
    keyItems: plan.keyItems.map(resolveItem),
    statPriority: formatStatPriorities(plan.statPriority),
    wave20Targets: Object.entries(plan.wave20Targets).map(([statId, range]) =>
      formatStatTarget(statId, range),
    ),
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
