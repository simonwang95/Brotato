import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, join } from "node:path";
import { createHash } from "node:crypto";

export const EXTRACTION_TOOL_VERSION = "brotato-static-extractors@4";

function sha256(path) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}
function productVersionFromInstallDir(installDir) {
  const infoPath = join(installDir, "Brotato.app/Contents/Info.plist");
  if (!existsSync(infoPath)) {
    return {
      value: "unknown",
      evidence: "Brotato.app/Contents/Info.plist not found",
    };
  }

  const plist = readFileSync(infoPath, "utf8");
  const version = plist.match(
    /<key>CFBundleShortVersionString<\/key>\s*<string>([^<]+)<\/string>/,
  )?.[1];
  if (!version) {
    return {
      value: "unknown",
      evidence: "CFBundleShortVersionString not found in Info.plist",
    };
  }

  return {
    value: version,
    evidence: "Brotato.app/Contents/Info.plist:CFBundleShortVersionString",
  };
}

export function buildSourceMetadata(installDir, packageInputs) {
  const loadedPackages = packageInputs
    .filter(({ path }) => existsSync(path))
    .map(({ id, path }) => {
      const stats = statSync(path);
      return {
        id,
        file: basename(path),
        sizeBytes: stats.size,
        sha256: sha256(path),
      };
    });
  const productVersion = productVersionFromInstallDir(installDir);

  return {
    extractorVersion: EXTRACTION_TOOL_VERSION,
    extractedAt: new Date().toISOString(),
    productVersion: productVersion.value,
    productVersionEvidence: productVersion.evidence,
    packages: loadedPackages,
    evidenceBoundary:
      "仅使用安装包、Brotato.app/Contents/Info.plist 和仓库静态数据；不读取玩家存档或本机解锁进度。",
  };
}
