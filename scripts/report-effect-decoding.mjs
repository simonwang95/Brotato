import { readFileSync, writeFileSync } from "node:fs";

const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const outputPath = process.env.BROTATO_EFFECT_DECODING_OUTPUT || "data/official-effect-decoding.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));

const groups = [
  {
    id: "pet-static-parameters",
    status: "decoded-static-parameters",
    impactScope: "宠物单体/爆炸/燃烧/地雷的静态伤害、攻击间隔和官方缩放；未假设每局宠物数量、命中率或存活时间。",
    matches: (effect) => /^EFFECT_PET_/.test(effect.textKey ?? ""),
  },
  {
    id: "burning",
    status: "partial-static-decode",
    impactScope: "燃烧入口和元素路线评分；触发率、跳数、持续时间和传播触发链仍需从运行时脚本确认。",
    matches: (effect) => /burning_effect/.test(effect.scriptPath ?? ""),
  },
  {
    id: "slow-zone",
    status: "pending-runtime-decode",
    impactScope: "减速区域的伤害覆盖和走位收益；区域幅度、持续时间、触发频率尚未由静态主资源证明。",
    matches: (effect) => /slow_in_zone_effect/.test(effect.scriptPath ?? ""),
  },
  {
    id: "extra-projectiles",
    status: "partial-static-decode",
    impactScope: "额外投射物/闪电/减速投射物的覆盖评分；子投射物伤害、命中率和触发频率未硬编码。",
    matches: (effect) => /projectiles_on_hit_effect/.test(effect.scriptPath ?? ""),
  },
  {
    id: "charm",
    status: "pending-runtime-decode",
    impactScope: "魅惑控制与输出窗口；低生命阈值、概率和持续时间尚未由静态主资源证明。",
    matches: (effect) => /null_charm_effect/.test(effect.scriptPath ?? ""),
  },
  {
    id: "high-low-health-threshold",
    status: "pending-runtime-decode",
    impactScope: "高/低生命目标条件伤害；阈值和场景占比未证明，只保留官方数值与保守文案。",
    matches: (effect) =>
      /null_double_value_effect/.test(effect.scriptPath ?? "") ||
      ["bonus_damage_against_targets_above_hp", "bonus_damage_against_targets_below_hp"].includes(
        effect.key,
      ),
  },
  {
    id: "giant-belt",
    status: "pending-runtime-decode",
    impactScope: "Giant Belt 的 giant_crit_damage 生命伤害换算；未证明普通敌人、精英和 Boss 的实际结算公式。",
    matches: (effect) => effect.key === "giant_crit_damage",
  },
  {
    id: "structure-internal-parameters",
    status: "partial-static-decode",
    impactScope: "结构物攻速、投射物、冷却、可暴击和地雷生成；结构物实际覆盖、命中率与存活时间不作伪造。",
    matches: (effect) =>
      /structure_effect|turret_effect|builder_turret_effect/.test(effect.scriptPath ?? "") ||
      ["structure_attack_speed", "structures_can_crit", "projectiles"].includes(effect.key),
  },
];

const records = [];
for (const catalogRecord of catalog.records ?? []) {
  for (const effect of catalogRecord.effects ?? []) {
    const group = groups.find(({ matches }) => matches(effect));
    if (!group) continue;
    records.push({
      group: group.id,
      status: group.status,
      impactScope: group.impactScope,
      kind: catalogRecord.kind,
      nameKey: catalogRecord.nameKey,
      recordId: catalogRecord.id,
      resourcePath: effect.path,
      effectKey: effect.key || effect.textKey || "unkeyed-effect",
      textKey: effect.textKey || null,
      scriptPath: effect.scriptPath || null,
      value: effect.value,
      chance: effect.chance,
      customKey: effect.customKey || null,
      customArgs: effect.customArgs,
      effectParameters: effect.effectParameters ?? {},
      relatedResources: effect.relatedResources ?? {},
    });
  }
}
records.sort((left, right) =>
  `${left.group}:${left.kind}:${left.nameKey}:${left.resourcePath}`.localeCompare(
    `${right.group}:${right.kind}:${right.nameKey}:${right.resourcePath}`,
  ),
);

const summary = records.reduce(
  (result, record) => {
    result.total += 1;
    result.byGroup[record.group] = (result.byGroup[record.group] ?? 0) + 1;
    result.byStatus[record.status] = (result.byStatus[record.status] ?? 0) + 1;
    return result;
  },
  { total: 0, byGroup: {}, byStatus: {} },
);

const output = {
  generatedFrom: catalogPath,
  sourceMetadata: catalog.sourceMetadata ?? null,
  note:
    "这是官方静态效果解码边界清单。decoded-static-parameters 仅表示主资源/SubResource 参数已读取；partial 或 pending 项不能直接当作精确 DPS。",
  summary,
  records,
};

if (process.argv.includes("--write")) {
  writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`Wrote ${records.length} effect decoding records to ${outputPath}`);
} else {
  console.log(JSON.stringify(summary, null, 2));
  console.log("\nRun with --write to generate the effect decoding manifest.");
}
