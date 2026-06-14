import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { TextDecoder } from "node:util";

const defaultInstallDir =
  "***REMOVED***/Library/Application Support/Steam/steamapps/common/Brotato";

const installDir = process.env.BROTATO_INSTALL_DIR || defaultInstallDir;
const catalogPath = process.env.BROTATO_CATALOG_PATH || "data/official-catalog.json";
const packageInputs = [
  {
    id: "base",
    path: join(installDir, "Brotato.app/Contents/Resources/Brotato.pck"),
  },
  {
    id: "abyssalTerrors",
    path: join(installDir, "BrotatoAbyssalTerrors.pck"),
  },
];

function readPackageResources(path) {
  if (!existsSync(path)) return null;

  const bytes = readFileSync(path);
  if (bytes.slice(0, 4).toString("ascii") !== "GDPC") return null;

  const fileCount = bytes.readUInt32LE(84);
  let position = 88;
  const resources = new Map();

  for (let index = 0; index < fileCount; index += 1) {
    const pathLength = bytes.readUInt32LE(position);
    position += 4;
    const resourcePath = bytes
      .slice(position, position + pathLength)
      .toString("utf8")
      .replace(/\0+$/, "");
    position += pathLength;

    const offset = Number(bytes.readBigUInt64LE(position));
    position += 8;
    const size = Number(bytes.readBigUInt64LE(position));
    position += 8;
    position += 16;

    resources.set(resourcePath, bytes.slice(offset, offset + size));
  }

  return resources;
}

function readText(buffer) {
  return new TextDecoder("utf-8", { fatal: false }).decode(buffer);
}

function extractImportedTexture(resources, iconResourcePath) {
  const importResource = resources.get(`${iconResourcePath}.import`);
  if (!importResource) return null;

  const importText = readText(importResource);
  const texturePath = importText.match(/path="([^"]+\.stex)"/)?.[1];
  if (!texturePath) return null;

  const texture = resources.get(texturePath);
  if (!texture) return null;

  const riffOffset = texture.indexOf(Buffer.from("RIFF"));
  const webpOffset = texture.indexOf(Buffer.from("WEBP"), riffOffset + 8);
  if (riffOffset >= 0 && webpOffset >= 0) {
    return {
      extension: "webp",
      bytes: texture.slice(riffOffset),
    };
  }

  const pngOffset = texture.indexOf(Buffer.from([0x89, 0x50, 0x4e, 0x47]));
  if (pngOffset >= 0) {
    return {
      extension: "png",
      bytes: texture.slice(pngOffset),
    };
  }

  return null;
}

const packages = new Map(
  packageInputs
    .map((input) => [input.id, readPackageResources(input.path)])
    .filter(([, resources]) => resources),
);

if (!packages.size) {
  console.error(`No Brotato packages found under: ${installDir}`);
  process.exit(1);
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
let exported = 0;
let missing = 0;

catalog.records = catalog.records.map((record) => {
  if (!record.iconResourcePath || !record.expectedImageAssetPath) return record;

  const resources = packages.get(record.sourcePackage);
  const extracted = resources
    ? extractImportedTexture(resources, record.iconResourcePath)
    : null;

  if (!extracted) {
    missing += 1;
    return {
      ...record,
      imageAssetPath: null,
    };
  }

  const assetPath = record.expectedImageAssetPath.replace(/\.[^.]+$/, `.${extracted.extension}`);
  mkdirSync(dirname(assetPath), { recursive: true });
  writeFileSync(assetPath, extracted.bytes);
  exported += 1;

  return {
    ...record,
    expectedImageAssetPath: assetPath,
    imageAssetPath: assetPath,
  };
});

writeFileSync(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
console.log(`Exported ${exported} image assets; ${missing} icons could not be extracted.`);
