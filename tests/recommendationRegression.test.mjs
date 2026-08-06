import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  generateStrategyGuide,
  getAvailableCharacters,
} from "../src/strategyGenerator.js";

const officialCatalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));

const TOP_N_BASELINES = {
  "lucky:normal20": {
    weapons: ["slingshot", "rock", "lute", "pruner", "WEAPON_FLUTE"],
    items: [
      "cyberball",
      "sifdsRelic",
      "babyGecko",
      "babyElephant",
      "luckyCharm",
      "babyWithABeard",
      "ITEM_PEARL",
      "ITEM_JERKY",
    ],
  },
  "lucky:endless": {
    weapons: ["lute", "slingshot", "pruner", "WEAPON_FLUTE", "WEAPON_POTATO_THROWER"],
    items: [
      "sifdsRelic",
      "babyGecko",
      "cyberball",
      "babyElephant",
      "babyWithABeard",
      "luckyCharm",
      "ITEM_PEARL",
      "ITEM_PIGGY_BANK",
    ],
  },
  "knight:normal20": {
    weapons: ["sword", "spikyShield", "spear", "WEAPON_TRIDENT", "WEAPON_CHOPPER"],
    items: [
      "whetstone",
      "wings",
      "coffee",
      "ITEM_MEDAL",
      "ITEM_RIPOSTE",
      "ITEM_VIGILANTE_RING",
      "ITEM_DYNAMITE",
      "ITEM_GRINDS_MAGICAL_LEAF",
    ],
  },
  "knight:endless": {
    weapons: ["sword", "spikyShield", "spear", "WEAPON_ROCK", "WEAPON_TRIDENT"],
    items: [
      "whetstone",
      "wings",
      "coffee",
      "ITEM_PIGGY_BANK",
      "ITEM_LUCKY_COIN",
      "ITEM_BABY_GECKO",
      "ITEM_EXPLOSIVE_SHELLS",
      "ITEM_POTATO",
    ],
  },
  "ghost:normal20": {
    weapons: ["ghostAxe", "ghostFlint", "ghostScepter", "WEAPON_SCYTHE"],
    items: [
      "wings",
      "coffee",
      "whetstone",
      "ITEM_ADRENALINE",
      "ITEM_LUCKY_COIN",
      "ITEM_MEDAL",
      "ITEM_RIPOSTE",
      "ITEM_VIGILANTE_RING",
    ],
  },
  "ghost:endless": {
    weapons: ["ghostAxe", "ghostFlint", "ghostScepter", "WEAPON_SCYTHE"],
    items: [
      "wings",
      "coffee",
      "whetstone",
      "ITEM_LUCKY_COIN",
      "ITEM_PIGGY_BANK",
      "ITEM_BABY_GECKO",
      "ITEM_EXPLOSIVE_SHELLS",
      "ITEM_POTATO",
    ],
  },
  "engineer:normal20": {
    weapons: ["wrench", "screwdriver", "WEAPON_CHAINSAW", "WEAPON_CHAIN_GUN", "WEAPON_DRILL"],
    items: [
      "turret",
      "robotArm",
      "coupon",
      "ITEM_JERKY",
      "ITEM_PIGGY_BANK",
      "ITEM_BUILDER_TURRET",
      "ITEM_METAL_DETECTOR",
      "ITEM_LURE",
    ],
  },
  "engineer:endless": {
    weapons: ["wrench", "screwdriver", "WEAPON_CHAINSAW", "WEAPON_CHAIN_GUN", "WEAPON_DRILL"],
    items: [
      "robotArm",
      "turret",
      "coupon",
      "ITEM_PIGGY_BANK",
      "ITEM_CROWN",
      "ITEM_GRINDS_MAGICAL_LEAF",
      "ITEM_METAL_DETECTOR",
      "ITEM_SPYGLASS",
    ],
  },
  "beastMaster:normal20": {
    weapons: [],
    items: [
      "catlingGun",
      "bonkDog",
      "botOMine",
      "blazemander",
      "wings",
      "lootworm",
      "ITEM_PEARL",
      "ITEM_JERKY",
    ],
  },
  "beastMaster:endless": {
    weapons: [],
    items: [
      "botOMine",
      "catlingGun",
      "bonkDog",
      "wings",
      "blazemander",
      "lootworm",
      "ITEM_PEARL",
      "ITEM_BABY_GECKO",
    ],
  },
};

function candidateKey(candidate) {
  return candidate.weaponId ?? candidate.itemId ?? candidate.official?.nameKey;
}

for (const [scenario, expected] of Object.entries(TOP_N_BASELINES)) {
  const [characterId, modeId] = scenario.split(":");
  const guide = generateStrategyGuide(characterId, modeId, { officialCatalog });
  assert.deepEqual(
    guide.recommendedWeapons.slice(0, 5).map(candidateKey),
    expected.weapons,
    `${scenario} weapon Top-N changed; review the scoring reasons before updating the baseline`,
  );
  assert.deepEqual(
    guide.keyItems.slice(0, 8).map(candidateKey),
    expected.items,
    `${scenario} item Top-N changed; review the scoring reasons before updating the baseline`,
  );
}

for (const character of getAvailableCharacters()) {
  for (const modeId of ["normal20", "endless"]) {
    const guide = generateStrategyGuide(character.id, modeId, { officialCatalog });
    const candidates = [...guide.recommendedWeapons, ...guide.keyItems];
    for (const candidate of candidates) {
      assert.ok(candidate.recommendationReasons?.length, `${character.id}:${modeId} needs reasons`);
      assert.ok(
        candidate.recommendationReasons.every((reason) => !/触发伤害 0(?:\.0+)? DPS/.test(reason)),
        `${character.id}:${modeId}:${candidateKey(candidate)} must not show a misleading 0 DPS reason`,
      );
    }
  }
}

console.log("Recommendation regression tests passed");
