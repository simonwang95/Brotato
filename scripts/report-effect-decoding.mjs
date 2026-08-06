import { readFileSync, writeFileSync } from "node:fs";
import { formatEffectDetail } from "../src/compendium.js";

const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const outputPath = process.env.BROTATO_EFFECT_DECODING_OUTPUT || "data/official-effect-decoding.json";
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const pendingDisplayPattern = /待解码|未知/;

function petHasStaticDamageParameters(effect) {
  const related = effect.relatedResources ?? {};
  return [
    [related.weapon_stats, related.weapon_stats?.cooldown],
    [related.ranged_weapon_stats, related.ranged_weapon_stats?.cooldown],
    [related.explosion_effect?.stats, related.explosion_effect?.stats?.cooldown],
    [related.landmine_effect_stat?.stats, related.landmine_effect_stat?.spawn_cooldown],
  ].some(([stats, cooldownFrames]) => stats?.damage > 0 && cooldownFrames > 0);
}

function groupValue(group, field, effect) {
  const value = group[field];
  return typeof value === "function" ? value(effect) : value;
}

const groups = [
  {
    id: "pet-static-parameters",
    status: (effect) =>
      petHasStaticDamageParameters(effect)
        ? "decoded-static-parameters"
        : "partial-static-decode",
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
    status: "partial-static-decode",
    impactScope: "魅惑概率和低生命阈值来自静态双值效果；持续时间仍需运行时脚本确认。",
    matches: (effect) => /null_charm_effect/.test(effect.scriptPath ?? ""),
  },
  {
    id: "high-low-health-threshold",
    status: "decoded-static-parameters",
    impactScope: "高/低生命目标条件伤害与生命阈值均来自静态双值效果；场景占比仍属于模型假设。",
    matches: (effect) =>
      ["bonus_damage_against_targets_above_hp", "bonus_damage_against_targets_below_hp"].includes(
        effect.key,
      ),
  },
  {
    id: "periodic-sub-effect",
    status: (effect) =>
      effect.subEffects?.length ? "decoded-static-parameters" : "pending-runtime-decode",
    impactScope: "周期性强化的触发计数和子效果来自静态 sub_effects 资源。",
    matches: (effect) =>
      /weapon_effect_with_sub_effect|effect_with_sub_effects/.test(effect.scriptPath ?? ""),
  },
  {
    id: "break-on-hit",
    status: "pending-runtime-decode",
    impactScope: "命中时的武器破损机制；触发概率和破损结果仍需从运行时脚本确认。",
    matches: (effect) => effect.key === "break_on_hit",
  },
  {
    id: "giant-belt",
    status: "decoded-static-parameters",
    impactScope: "Giant Belt 的普通目标、Boss 与精英当前生命伤害百分比来自静态双值效果和官方翻译模板。",
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
  {
    id: "timed-temporary-stat",
    status: (effect) =>
      Number.isFinite(effect.effectParameters?.interval)
        ? "decoded-static-parameters"
        : "pending-runtime-decode",
    impactScope: "波次内临时属性的增量、间隔和受伤重置标记来自静态效果资源。",
    matches: (effect) => effect.customKey === "temp_stats_per_interval",
  },
  {
    id: "damage-taken-window",
    status: (effect) =>
      Number.isFinite(effect.effectParameters?.duration_secs)
        ? "decoded-static-parameters"
        : "pending-runtime-decode",
    impactScope: "目标额外承伤数值、持续时间、叠加层数和触发上限来自静态效果资源。",
    matches: (effect) => effect.customKey === "enemy_percent_damage_taken",
  },
  {
    id: "projectile-trigger",
    status: (effect) =>
      effect.relatedResources?.weapon_stats ? "decoded-static-parameters" : "pending-runtime-decode",
    impactScope: "异形眼球与死亡投射物的数量、间隔、伤害和属性缩放来自关联武器资源。",
    matches: (effect) => ["alien_eyes", "projectiles_on_death"].includes(effect.key),
  },
  {
    id: "conditional-static-effect",
    status: (effect) => {
      if (effect.key === "torture") return "decoded-static-parameters";
      if (effect.key === "explode_when_below_hp") {
        return Number.isFinite(effect.effectParameters?.hp_threshold) && effect.relatedResources?.stats
          ? "decoded-static-parameters"
          : "pending-runtime-decode";
      }
      return Number.isFinite(effect.effectParameters?.value2)
        ? "decoded-static-parameters"
        : "pending-runtime-decode";
    },
    impactScope: "生命条件、减速上限或固定恢复限制来自静态双值效果及官方翻译模板。",
    matches: (effect) =>
      ["hp_regen_bonus", "remove_speed", "explode_when_below_hp", "torture"].includes(effect.key),
  },
  {
    id: "burn-on-hit",
    status: (effect) =>
      effect.relatedResources?.burning_data ? "decoded-static-parameters" : "pending-runtime-decode",
    impactScope: "攻击燃烧概率、伤害、持续时间和元素缩放来自关联 burning_data 静态资源。",
    matches: (effect) => effect.key === "burn_chance",
  },
  {
    id: "global-static-modifier",
    status: "decoded-static-parameters",
    impactScope: "角色全局修正的 key/value 直接来自静态角色效果资源。",
    matches: (effect) =>
      ["weapons_price", "max_turret_count", "trees_start_wave", "map_size", "max_ranged_weapons"].includes(
        effect.key,
      ),
  },
];

const records = [];
for (const catalogRecord of catalog.records ?? []) {
  for (const effect of catalogRecord.effects ?? []) {
    const displayText = formatEffectDetail(effect);
    const hasPendingDisplay = pendingDisplayPattern.test(displayText);
    const matchedGroup = groups.find(({ matches }) => matches(effect));
    if (!matchedGroup && !hasPendingDisplay) continue;
    const group = matchedGroup ?? {
      id: "unclassified-runtime-effect",
      status: "pending-runtime-decode",
      impactScope:
        "图鉴仍明确标注待解码的官方特殊效果；已记录静态入口，但具体运行时参数尚未可靠分类。",
    };
    records.push({
      group: group.id,
      status: groupValue(group, "status", effect),
      impactScope: groupValue(group, "impactScope", effect),
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
      displayText,
      hasPendingDisplay,
      effectParameters: effect.effectParameters ?? {},
      relatedResources: effect.relatedResources ?? {},
      subEffects: effect.subEffects ?? [],
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
    "这是官方静态效果解码边界清单。所有图鉴中仍显示待解码/未知的效果都必须进入清单；decoded-static-parameters 仅表示可用的主资源/SubResource 参数已读取，partial 或 pending 项不能直接当作精确 DPS。",
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
