// P1-9 / F3：生成推荐回归测试的独立专家基准 fixture（tests/fixtures/recommendationBaseline.json）。
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
// 用法：node scripts/generate-recommendation-baseline.mjs
// 重新生成时保留既有 fixture 的 mustExclude（已为官方 nameKey 命名空间）。
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { generateStrategyGuide, getAvailableCharacters } from "../src/strategyGenerator.js";

const officialCatalog = JSON.parse(readFileSync("data/official-catalog.json", "utf8"));
const fixturePath = "tests/fixtures/recommendationBaseline.json";
const oldFixture = existsSync(fixturePath)
  ? JSON.parse(readFileSync(fixturePath, "utf8"))
  : {};

const fixture = {};
let unmapped = 0;
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
    fixture[`${character.id}:${modeId}`] = {
      mustInclude: {
        weapons: pick(guide.recommendedWeapons, 5),
        items: pick(guide.keyItems, 8),
      },
      // 保留既有负向基准（官方禁用项 nameKey / 属性禁用标记）。
      mustExclude: oldFixture[`${character.id}:${modeId}`]?.mustExclude ?? [],
    };
  }
}

writeFileSync(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`);
console.log(
  `[generate-recommendation-baseline] 已生成 ${Object.keys(fixture).length} 个角色/模式条目` +
    `（mustInclude 统一官方 nameKey 命名空间，未映射候选 ${unmapped} 个）`,
);