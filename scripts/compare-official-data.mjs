import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const DATASETS = [
  {
    file: "data/official-catalog.json",
    label: "catalog",
    entries(data) {
      return (data.records ?? []).map((record) => [`${record.kind}:${record.id}`, record]);
    },
  },
  {
    file: "data/official-localization.json",
    label: "localization",
    entries(data) {
      return Object.entries(data.entries ?? {});
    },
  },
  {
    file: "data/official-unlocks.json",
    label: "unlocks",
    entries(data) {
      return (data.records ?? []).map((record) => [record.challengeId, record]);
    },
  },
  {
    file: "data/official-effect-decoding.json",
    label: "effects",
    entries(data) {
      return (data.records ?? []).map((record) => [
        [record.resourcePath, record.effectKey, record.recordId, record.group].join("|"),
        record,
      ]);
    },
  },
];

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])]),
  );
}

function stableJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sourceMetadata(data) {
  const metadata = data.sourceMetadata ?? {};
  return {
    extractorVersion: metadata.extractorVersion ?? null,
    productVersion: metadata.productVersion ?? null,
    packages: (metadata.packages ?? [])
      .map(({ id, file, sizeBytes, sha256 }) => ({ id, file, sizeBytes, sha256 }))
      .sort((a, b) => String(a.id).localeCompare(String(b.id))),
  };
}

function compareMetadata(before, after) {
  const previous = sourceMetadata(before);
  const current = sourceMetadata(after);
  return Object.keys(previous).filter(
    (field) => stableJson(previous[field]) !== stableJson(current[field]),
  );
}

function entryMap(definition, data) {
  const entries = definition.entries(data);
  const result = new Map(entries);
  if (result.size !== entries.length) {
    throw new Error(`Duplicate comparison key in ${definition.file}`);
  }
  return result;
}

function compareDataset(definition, before, after) {
  const beforeEntries = entryMap(definition, before);
  const afterEntries = entryMap(definition, after);
  const beforeKeys = new Set(beforeEntries.keys());
  const afterKeys = new Set(afterEntries.keys());
  const added = [...afterKeys].filter((key) => !beforeKeys.has(key)).sort();
  const removed = [...beforeKeys].filter((key) => !afterKeys.has(key)).sort();
  const changed = [...afterKeys]
    .filter(
      (key) =>
        beforeKeys.has(key) && stableJson(beforeEntries.get(key)) !== stableJson(afterEntries.get(key)),
    )
    .sort();
  const metadataChanged = compareMetadata(before, after);

  return {
    file: definition.file,
    label: definition.label,
    beforeCount: beforeEntries.size,
    afterCount: afterEntries.size,
    added,
    removed,
    changed,
    metadataChanged,
    hasChanges: Boolean(added.length || removed.length || changed.length || metadataChanged.length),
  };
}

export function compareOfficialDataSnapshots(beforeByFile, afterByFile) {
  const datasets = DATASETS.map((definition) => {
    if (!beforeByFile[definition.file] || !afterByFile[definition.file]) {
      throw new Error(`Missing official data snapshot: ${definition.file}`);
    }
    return compareDataset(
      definition,
      beforeByFile[definition.file],
      afterByFile[definition.file],
    );
  });

  return {
    datasets,
    hasChanges: datasets.some((dataset) => dataset.hasChanges),
  };
}

function formatKeys(label, keys) {
  if (!keys.length) return [];
  const visible = keys.slice(0, 20);
  const suffix = keys.length > visible.length ? ` (+${keys.length - visible.length} more)` : "";
  return [`    ${label}: ${visible.join(", ")}${suffix}`];
}

export function formatOfficialDataDiff(report, reference = "HEAD") {
  const lines = [`Official data diff against ${reference}:`];
  for (const dataset of report.datasets) {
    lines.push(
      `- ${dataset.label}: ${dataset.beforeCount} -> ${dataset.afterCount}; +${dataset.added.length} / -${dataset.removed.length} / ~${dataset.changed.length}`,
    );
    lines.push(...formatKeys("added", dataset.added));
    lines.push(...formatKeys("removed", dataset.removed));
    lines.push(...formatKeys("changed", dataset.changed));
    lines.push(...formatKeys("source metadata", dataset.metadataChanged));
  }
  lines.push(
    report.hasChanges
      ? "Official static data changed; review the records above before committing regenerated files."
      : "No semantic official-data changes. Extraction timestamps are intentionally ignored.",
  );
  return lines.join("\n");
}

function parseArguments(args) {
  const options = { reference: "HEAD", json: false, failOnChange: false };
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--ref") {
      options.reference = args[index + 1];
      index += 1;
    } else if (argument === "--json") {
      options.json = true;
    } else if (argument === "--fail-on-change") {
      options.failOnChange = true;
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }
  }
  if (!options.reference) throw new Error("--ref requires a git reference");
  return options;
}

function loadSnapshots(reference) {
  const before = {};
  const after = {};
  for (const { file } of DATASETS) {
    before[file] = JSON.parse(
      execFileSync("git", ["show", `${reference}:${file}`], {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
      }),
    );
    after[file] = JSON.parse(readFileSync(file, "utf8"));
  }
  return { before, after };
}

function runCli() {
  const options = parseArguments(process.argv.slice(2));
  const snapshots = loadSnapshots(options.reference);
  const report = compareOfficialDataSnapshots(snapshots.before, snapshots.after);
  console.log(options.json ? JSON.stringify(report, null, 2) : formatOfficialDataDiff(report, options.reference));
  if (options.failOnChange && report.hasChanges) process.exitCode = 2;
}

const isMainModule =
  process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;

if (isMainModule) {
  try {
    runCli();
  } catch (error) {
    console.error(`Official data diff failed: ${error.message}`);
    process.exitCode = 1;
  }
}
