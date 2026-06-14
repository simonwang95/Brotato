import { cpSync, mkdirSync, rmSync } from "node:fs";
import { join } from "node:path";

const outputDir = "public";
const staticEntries = ["index.html", "styles.css", "src", "data"];

rmSync(outputDir, { recursive: true, force: true });
mkdirSync(outputDir, { recursive: true });

staticEntries.forEach((entry) => {
  cpSync(entry, join(outputDir, entry), { recursive: true });
});

console.log(`Built static site into ${outputDir}/`);
