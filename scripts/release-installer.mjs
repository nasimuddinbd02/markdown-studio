#!/usr/bin/env node
// Builds the Windows installer and publishes it into downloads/ so it can be
// downloaded straight from the repository, then updates the README link.
//   npm run release:installer            (build + publish)
//   npm run release:installer -- --skip-build   (publish an existing build)
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;
const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(readFileSync("src-tauri/Cargo.toml", "utf8"))?.[1];
if (conf.version !== version || cargoVersion !== version) {
  console.error(`Version mismatch: package.json ${version}, tauri.conf.json ${conf.version}, Cargo.toml ${cargoVersion}.`);
  console.error("Run: npm run version:set <version>");
  process.exit(1);
}

if (!process.argv.includes("--skip-build")) {
  console.log(`Building Markdown Studio ${version} installer…`);
  execSync("npx tauri build --bundles nsis", { stdio: "inherit" });
}

const built = join("src-tauri", "target", "release", "bundle", "nsis", `${conf.productName}_${version}_x64-setup.exe`);
if (!existsSync(built)) {
  console.error(`Installer not found: ${built}`);
  process.exit(1);
}

const outDir = "downloads";
mkdirSync(outDir, { recursive: true });
// Keep only the latest installer in the repository.
for (const f of readdirSync(outDir)) if (f.endsWith(".exe")) rmSync(join(outDir, f));

const fileName = `MarkdownStudio-${version}-windows-x64-setup.exe`;
const target = join(outDir, fileName);
copyFileSync(built, target);
const bytes = readFileSync(target);
const sha256 = createHash("sha256").update(bytes).digest("hex");
const sizeMb = (statSync(target).size / 1024 / 1024).toFixed(1);
writeFileSync(join(outDir, "SHA256SUMS.txt"), `${sha256}  ${fileName}\n`);

const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const link = `${outDir}/${fileName}?raw=true`;
const section = `<!-- download:start -->
### ⬇️ [Download Markdown Studio ${version} for Windows (64-bit)](${link})

| Version | Platform | Size | Released | SHA-256 |
| --- | --- | --- | --- | --- |
| ${version} | Windows 10 (1803+) / 11, x64 | ${sizeMb} MB | ${date} | \`${sha256}\` |

**Install in 3 steps:**

1. **Download** the installer with the link above. On GitHub you can also open [\`downloads/\`](${outDir}/), click the \`.exe\`, then **Download raw file**.
2. **Run** it. No administrator rights are needed; it installs for your user account. The installer isn't code-signed yet, so if Windows SmartScreen says *"Windows protected your PC"*, choose **More info → Run anyway**.
3. **Start** Markdown Studio from the Start menu, or double-click any \`.md\` file.

Newer versions install over older ones and keep your settings. For requirements, checksum verification, silent install, uninstalling and troubleshooting, see the **[installation guide](docs/INSTALL.md)**.
<!-- download:end -->`;

let readme = readFileSync("README.md", "utf8");
const block = /<!-- download:start -->[\s\S]*?<!-- download:end -->/;
if (block.test(readme)) readme = readme.replace(block, section);
else readme = readme.replace(/(\n## Features)/, `\n## Download\n\n${section}\n$1`);
writeFileSync("README.md", readme);

const installGuide = join("docs", "INSTALL.md");
if (existsSync(installGuide)) {
  let guide = readFileSync(installGuide, "utf8");
  guide = guide.replace(
    /<!-- installer-link -->[\s\S]*?<!-- \/installer-link -->/,
    `<!-- installer-link -->[**${fileName}**](../${link})<!-- /installer-link -->`,
  );
  guide = guide.replace(/MarkdownStudio-[\d.]+(?:-[0-9A-Za-z.-]+)?-windows-x64-setup\.exe \/S/g, `${fileName} /S`);
  writeFileSync(installGuide, guide);
}

console.log(`\nPublished ${target} (${sizeMb} MB)\nSHA-256 ${sha256}\nREADME download section updated.`);
