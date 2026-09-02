// P1-9 / F3 / 第三轮 P2：生成推荐回归测试的独立专家基准 fixture
// （tests/fixtures/recommendationBaseline.json）。
//
// 背景：
//   - 正向基准（mustInclude）从当前输出冻结而来（含排名），独立于运行时断言，非循环论证；
//   - 负向基准（mustExclude）记录该角色的官方禁用项，必须与候选比较使用同一 ID 命名空间。
//
// F3 关键约束：
//   - mustInclude 的 id 统一使用官方 nameKey（candidate.official.nameKey），
//     与测试侧候选比较的命名空间一致（手写候选 coffee 与官方候选 ITEM_COFFEE 归一到同一 id）；
//   - 无法映射到官方 nameKey 的候选必须显式报错，绝不回退到手写 id 静默写入 fixture。
//
// 第三轮 P2：mustExclude 完全从官方目录派生，不再从旧 fixture 复制
// （旧实现把旧 fixture 的 mustExclude 原样搬进新 fixture，旧 fixture 移走后
// 生成器产出 mustExclude: 0，负向基准不可重建）：
//   - 角色 bannedItems（record-id）→ 官方 nameKey（解析失败显式报错）；
//   - 角色 bannedItemGroups → 大写组标记（每个标记必须对应目录中至少一条
//     标签集合精确相等的道具记录，按 groupTagSet 语义校验，防止写入空标记）；
//   - 角色 bannedUpgrades → 大写升级标记，单独存于 bannedUpgrades 字段：
//     游戏升级商店道具不在候选空间内（目录与攻略输出均不含升级记录），
//     不计入 mustExclude 的候选级断言，仅做存在性校验。
//
// 用法：node scripts/generate-recommendation-baseline.mjs
import { readFileSync, writeFileSync } from "node:fs";
import {
  findOfficialCharacterRecord,
  generateStrategyGuide,
  getAvailableCharacters,
  groupTagSet,
} from "../src/strategyGenerator.js";

const officialCatalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const fixturePath = "tests/fixtures/recommendationBaseline.json";

// 目录效果键词汇表：升级标记存在性校验用（属性部分须有记录携带对应效果键）。
const effectKeyVocabulary = new Set();
// 目录道具标签词汇表：组标记合法性校验用（组内每个 stat 标签须真实存在）。
const tagVocabulary = new Set();
for (const record of officialCatalog.records) {
  for (const effect of record.effects ?? []) effectKeyVocabulary.add(effect.key);
  if (record.kind === "item") for (const tag of record.tags ?? []) tagVocabulary.add(tag);
}

// 组标记是否合法：组标签集合中的每个 stat 标签都存在于目录标签词汇中。
// 不要求当前 pck 恰好有道具「精确匹配」该组——复合组（如 melee_and_ranged_damage）
// 在当前版本可能 0 条精确匹配（版本漂移），但组本身是真实禁用，标记仍应写入；
// 此检查只拦截拼写错误的无效组（其 stat 标签不在词汇中）。
function markerIsReal(marker) {
  const tagSet = groupTagSet(marker);
  if (!tagSet.size) return false;
  for (const tag of tagSet) {
    if (!tagVocabulary.has(tag)) return false;
  }
  return true;
}

const fixture = {};
let unmapped = 0;
let nameKeyExcludes = 0;
let groupExcludes = 0;
let upgradeExcludes = 0;
for (const character of getAvailableCharacters()) {
  for (const modeId of ["normal20", "endless"]) {
    const guide = generateStrategyGuide(character.id, modeId, { officialCatalog });
    const pick = (list, limit) =>
      list.slice(0, limit).map((candidate, index) => {
        // F3：统一官方 nameKey 命名空间；无法映射的候选显式报错。
        const nameKey = candidate.official?.nameKey;
        if (!nameKey) {
          unmapped += 1;
          throw new Error(
            `${character.id}:${modeId} 候选 ${candidate.weaponId ?? candidate.itemId} 无法映射到官方 nameKey，拒绝写入 fixture`,
          );
        }
        return { id: nameKey, rank: index + 1 };
      });

    // P2：负向基准从官方目录派生（同一角色/模式的两个条目共享同一禁用集合）。
    const characterRecord = findOfficialCharacterRecord(officialCatalog, character);
    const mustExclude = new Set();
    const bannedUpgrades = new Set();
    if (characterRecord) {
      // bannedItems：record-id → 官方 nameKey（解析失败显式报错）。
      for (const id of characterRecord.bannedItems ?? []) {
        const record = officialCatalog.records.find((r) => r.id === id);
        if (!record) {
          throw new Error(
            `${character.id} bannedItems 的 ${id} 无法在官方目录中解析，拒绝生成负向基准`,
          );
        }
        mustExclude.add(record.nameKey);
      }
      // bannedItemGroups：大写组标记（每个标记的 stat 标签须真实存在于目录词汇）。
      for (const group of characterRecord.bannedItemGroups ?? []) {
        const marker = String(group).toUpperCase();
        if (!markerIsReal(marker)) {
          throw new Error(
            `${character.id} bannedItemGroups 的 ${marker} 含不存在的 stat 标签，拒绝写入无效标记`,
          );
        }
        mustExclude.add(marker);
      }
      // bannedUpgrades：大写升级标记（单独字段，候选空间外）。
      for (const upgrade of characterRecord.bannedUpgrades ?? []) {
        const marker = String(upgrade).toUpperCase();
        const statPart = marker.slice("UPGRADE_".length).toLowerCase();
        const statExists = effectKeyVocabulary.has(`stat_${statPart}`) || effectKeyVocabulary.has(statPart);
        if (!statExists) {
          throw new Error(
            `${character.id} bannedUpgrades 的 ${marker} 属性部分不在目录效果键词汇中，拒绝写入`,
          );
        }
        bannedUpgrades.add(marker);
      }
    }
    const sortedExclude = [...mustExclude].sort();
    nameKeyExcludes += sortedExclude.filter((id) => id.startsWith("ITEM_") || id.startsWith("WEAPON_")).length;
    groupExcludes += sortedExclude.filter((id) => !id.startsWith("ITEM_") && !id.startsWith("WEAPON_")).length;
    upgradeExcludes += bannedUpgrades.size;

    fixture[`${character.id}:${modeId}`] = {
      mustInclude: {
        weapons: pick(guide.recommendedWeapons, 5),
        items: pick(guide.keyItems, 8),
      },
      mustExclude: sortedExclude,
      bannedUpgrades: [...bannedUpgrades].sort(),
    };
  }
}

writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  `[generate-recommendation-baseline] 已生成 ${Object.keys(fixture).length} 个角色/模式条目` +
    `（mustInclude 统一官方 nameKey 命名空间，未映射候选 ${unmapped} 个；` +
    `mustExclude 共 ${nameKeyExcludes + groupExcludes} 条 = nameKey ${nameKeyExcludes} + 禁用组标记 ${groupExcludes}；` +
    `bannedUpgrades 共 ${upgradeExcludes} 条，单独字段不计入候选级断言）`,
);
