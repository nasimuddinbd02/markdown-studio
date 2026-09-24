#!/usr/bin/env node
// Builds the Windows installers and publishes them:
//   * the standard installer (small; downloads WebView2 only if it is missing)
//     goes into downloads/ so it can be downloaded straight from the repository;
//   * with --offline, an offline installer that bundles the WebView2 runtime
//     (~210 MB, too large for a git repository) goes into release-assets/ for
//     upload to a GitHub Release (npm run release:github).
// It then updates the README download section and docs/INSTALL.md links.
//
//   npm run release:installer                   standard installer
//   npm run release:installer -- --offline      standard + offline installers
//   npm run release:installer -- --skip-build   republish existing builds
import { execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const withOffline = args.includes("--offline");

const pkg = JSON.parse(readFileSync("package.json", "utf8"));
const version = pkg.version;
const conf = JSON.parse(readFileSync("src-tauri/tauri.conf.json", "utf8"));
const cargoVersion = /^version\s*=\s*"([^"]+)"/m.exec(readFileSync("src-tauri/Cargo.toml", "utf8"))?.[1];
if (conf.version !== version || cargoVersion !== version) {
  console.error(`Version mismatch: package.json ${version}, tauri.conf.json ${conf.version}, Cargo.toml ${cargoVersion}.`);
  console.error("Run: npm run version:set <version>");
  process.exit(1);
}

const remote = execSync("git remote get-url origin").toString().trim();
const repo = /github\.com[:/](.+?)(?:\.git)?$/.exec(remote)?.[1] ?? "OWNER/REPO";
const bundlePath = join("src-tauri", "target", "release", "bundle", "nsis", `${conf.productName}_${version}_x64-setup.exe`);
const sha256Of = (file) => createHash("sha256").update(readFileSync(file)).digest("hex");
const mb = (file) => (statSync(file).size / 1024 / 1024).toFixed(1);

// ---------------------------------------------------------------- standard installer
const outDir = "downloads";
const fileName = `MarkdownStudio-${version}-windows-x64-setup.exe`;
const target = join(outDir, fileName);
if (!skipBuild) {
  console.log(`Building Markdown Studio ${version} installer…`);
  execSync("npx tauri build --bundles nsis", { stdio: "inherit" });
}
if (!skipBuild || !existsSync(target)) {
  if (!existsSync(bundlePath)) {
    console.error(`Installer not found: ${bundlePath}`);
    process.exit(1);
  }
  mkdirSync(outDir, { recursive: true });
  // Keep only the latest installer in the repository.
  for (const f of readdirSync(outDir)) if (f.endsWith(".exe")) rmSync(join(outDir, f));
  copyFileSync(bundlePath, target);
}

// ---------------------------------------------------------------- offline installer
const assetsDir = "release-assets";
const offlineName = `MarkdownStudio-${version}-windows-x64-offline-setup.exe`;
const offlineTarget = join(assetsDir, offlineName);
if (withOffline) {
  if (!skipBuild) {
    console.log(`Building Markdown Studio ${version} offline installer (bundles WebView2)…`);
    execSync("npx tauri build --bundles nsis --config src-tauri/tauri.offline.conf.json", { stdio: "inherit" });
  }
  if (!skipBuild || !existsSync(offlineTarget)) {
    mkdirSync(assetsDir, { recursive: true });
    for (const f of readdirSync(assetsDir)) if (f.endsWith(".exe")) rmSync(join(assetsDir, f));
    copyFileSync(bundlePath, offlineTarget);
  }
}
const hasOffline = existsSync(offlineTarget);

// ---------------------------------------------------------------- checksums
const sha256 = sha256Of(target);
const sizeMb = mb(target);
let sums = `${sha256}  ${fileName}\n`;
let offlineSha = null;
if (hasOffline) {
  offlineSha = sha256Of(offlineTarget);
  sums += `${offlineSha}  ${offlineName}\n`;
}
writeFileSync(join(outDir, "SHA256SUMS.txt"), sums);
if (hasOffline) copyFileSync(join(outDir, "SHA256SUMS.txt"), join(assetsDir, "SHA256SUMS.txt"));

// ---------------------------------------------------------------- README + INSTALL.md
const now = new Date();
const date = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const link = `${outDir}/${fileName}?raw=true`;
const releaseUrl = `https://github.com/${repo}/releases/tag/v${version}`;
const offlineUrl = `https://github.com/${repo}/releases/download/v${version}/${offlineName}`;
const offlineRow = hasOffline
  ? `\n| **Offline**: [${offlineName}](${offlineUrl}) | Includes WebView2; no internet needed | ${mb(offlineTarget)} MB | \`${offlineSha}\` |`
  : "";
const section = `<!-- download:start -->
### ⬇️ [Download Markdown Studio ${version} for Windows (64-bit)](${link})

Released ${date} for Windows 10 (1803+) and 11, x64. Nothing else needs to be installed: the app is self-contained.

| Installer | When to use it | Size | SHA-256 |
| --- | --- | --- | --- |
| **Standard**: [${fileName}](${link}) | Recommended. WebView2 is already part of Windows 11 and updated Windows 10; if it's missing, the installer adds it automatically (needs internet) | ${sizeMb} MB | \`${sha256}\` |${offlineRow}

**Install in 3 steps:**

1. **Download** an installer above${hasOffline ? ` (all files are also on the [${version} release page](${releaseUrl}))` : ""}.
2. **Run** it and choose **Anyone who uses this computer**, which needs administrator approval, or **Only for me**, which doesn't. The installer isn't code-signed yet, so if Windows SmartScreen says *"Windows protected your PC"*, choose **More info → Run anyway**.
3. **Start** Markdown Studio from the Start menu, or right-click any \`.md\` file and choose **Open with Markdown Studio**.

The app appears in **Settings → Apps → Installed apps** and in **Control Panel → Programs and Features**, where it can be uninstalled. Newer versions install over older ones and keep your settings. For requirements, checksum verification, silent install, uninstalling and troubleshooting, see the **[installation guide](docs/INSTALL.md)**.
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
  guide = guide.replace(
    /<!-- offline-link -->[\s\S]*?<!-- \/offline-link -->/,
    `<!-- offline-link -->${hasOffline ? `[**${offlineName}**](${offlineUrl})` : "the offline installer from the latest GitHub release"}<!-- /offline-link -->`,
  );
  guide = guide.replace(/MarkdownStudio-[\d.]+(?:-[0-9A-Za-z.-]+)?-windows-x64-setup\.exe \/S/g, `${fileName} /S`);
  writeFileSync(installGuide, guide);
}

console.log(`\nStandard installer: ${target} (${sizeMb} MB)\n  SHA-256 ${sha256}`);
if (hasOffline) console.log(`Offline installer:  ${offlineTarget} (${mb(offlineTarget)} MB)\n  SHA-256 ${offlineSha}`);
console.log("README and docs/INSTALL.md updated.");
if (hasOffline) console.log(`Next: commit + push, then  npm run release:github  to publish ${releaseUrl}`);
