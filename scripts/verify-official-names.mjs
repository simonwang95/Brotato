import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { TextDecoder } from "node:util";
import { CHARACTER_GUIDES, ITEMS, WEAPONS } from "../src/strategyData.js";
import { ITEM_EFFECTS } from "../src/scenarioData.js";

const defaultInstallDir = join(
  homedir(),
  "Library/Application Support/Steam/steamapps/common/Brotato",
);

const installDir = process.env.BROTATO_INSTALL_DIR || defaultInstallDir;
const packagePaths = [
  join(installDir, "Brotato.app/Contents/Resources/Brotato.pck"),
  join(installDir, "BrotatoAbyssalTerrors.pck"),
];

function loadPackageText(paths) {
  const decoder = new TextDecoder("utf-8", { fatal: false });
  const loaded = [];
  const text = paths
    .filter((path) => existsSync(path))
    .map((path) => {
      loaded.push(path);
      return decoder.decode(readFileSync(path));
    })
    .join("\n");

  return { text, loaded };
}

function uniqTerms(entries) {
  const seen = new Set();
  return entries.filter((entry) => {
    const key = `${entry.kind}:${entry.id}:${entry.term}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function collectTerms() {
  const weaponTerms = Object.values(WEAPONS).map((weapon) => ({
    kind: "weapon",
    id: weapon.id,
    en: weapon.name,
    term: weapon.cnName,
  }));
  const itemTerms = Object.values(ITEMS).map((item) => ({
    kind: "item",
    id: item.id,
    en: item.name,
    term: item.cnName,
  }));
  const effectTerms = Object.values(ITEM_EFFECTS)
    .filter((effect) => effect.id !== "none")
    .map((effect) => ({
      kind: "item-effect",
      id: effect.id,
      en: effect.name,
      term: effect.cnName,
    }));
  const characterTerms = Object.values(CHARACTER_GUIDES).map((character) => ({
    kind: "character",
    id: character.id,
    en: character.name,
    term: character.cnHint.split("，")[0],
  }));

  return uniqTerms([...weaponTerms, ...itemTerms, ...effectTerms, ...characterTerms]);
}

function verifyTerms(haystack, terms) {
  return terms.map((entry) => ({
    ...entry,
    found: haystack.includes(entry.term),
  }));
}

function printGroup(title, rows) {
  console.log(`\n${title} (${rows.length})`);
  rows.forEach((row) => {
    console.log(`- [${row.kind}] ${row.en} / ${row.term} (${row.id})`);
  });
}

const { text, loaded } = loadPackageText(packagePaths);

if (!loaded.length) {
  console.error(`No Brotato packages found under: ${installDir}`);
  process.exit(1);
}

const results = verifyTerms(text, collectTerms());
const found = results.filter((result) => result.found);
const missing = results.filter((result) => !result.found);

console.log("Brotato official-name scan");
console.log(`Install dir: ${installDir}`);
console.log("Packages:");
loaded.forEach((path) => console.log(`- ${path}`));
console.log(`\nVerified ${found.length}/${results.length} Chinese terms.`);

printGroup("Found in installed packages", found);
printGroup("Not found, needs manual check", missing);

// P1-4：默认即为严格门禁，消除“有缺失但成功退出”的假绿语义。
// - 存在缺失的官方中文名称时以退出码 2 阻止（发布/合并前必须清零）。
// - 该检查依赖本机游戏安装包（BROTATO_INSTALL_DIR），属于本地发布前门禁，
//   不在 CI 的干净检出环境中运行（CI 走 portable 校验，见 scripts/verify-build.mjs）。
// - 如需仅查看不阻断（例如排查中），可传 --warn 退回旧的非阻断行为。
const warnOnly = process.argv.includes("--warn");
if (missing.length > 0 && !warnOnly) {
  console.error(
    `\n[verify:names] 严格门禁未通过：${missing.length} 个官方中文名称未在本机安装包中找到。` +
      "请修正 src 中的名称（对照 data/official-localization.json）后重试；排查中可临时用 --warn。",
  );
  process.exit(2);
}
if (missing.length > 0 && warnOnly) {
  console.error(
    `\n[verify:names] --warn：${missing.length} 个名称未找到（未阻断）。`,
  );
}
