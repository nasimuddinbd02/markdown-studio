#!/usr/bin/env node
// Creates (or updates) the GitHub Release v<version> and uploads the
// installers: the standard installer from downloads/ and the offline
// installer from release-assets/ (too large for the repository).
// Requires the GitHub CLI (`gh auth login`) and the release commit pushed.
//   npm run release:github
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const version = JSON.parse(readFileSync("package.json", "utf8")).version;
const tag = `v${version}`;
const files = [
  join("downloads", `MarkdownStudio-${version}-windows-x64-setup.exe`),
  join("release-assets", `MarkdownStudio-${version}-windows-x64-offline-setup.exe`),
  join("downloads", "SHA256SUMS.txt"),
].filter(existsSync);
if (files.length < 2) {
  console.error("Installers not found. Run: npm run release:installer -- --offline");
  process.exit(1);
}

const gh = (...a) => execFileSync("gh", a, { stdio: ["ignore", "pipe", "inherit"] }).toString();
const notes = `## Markdown Studio ${version}

A fast, local-first Markdown editor for Windows. Nothing else needs to be installed.

| File | Use it when |
| --- | --- |
| \`MarkdownStudio-${version}-windows-x64-setup.exe\` | **Recommended.** Small download. WebView2 is already part of Windows 11 and updated Windows 10; if it's missing, the installer adds it automatically (needs internet). |
| \`MarkdownStudio-${version}-windows-x64-offline-setup.exe\` | The PC has **no internet access** or is locked down. It includes the Microsoft Edge WebView2 runtime. |
| \`SHA256SUMS.txt\` | Verify a download: \`Get-FileHash <file> -Algorithm SHA256\` |

The installer isn't code-signed yet: if SmartScreen warns, choose **More info → Run anyway**.
See the [installation guide](https://github.com/${gh("repo", "view", "--json", "nameWithOwner", "-q", ".nameWithOwner").trim()}/blob/main/docs/INSTALL.md).
`;
const notesFile = join(tmpdir(), `markdown-studio-${tag}-notes.md`);
writeFileSync(notesFile, notes);

let exists = true;
try {
  gh("release", "view", tag);
} catch {
  exists = false;
}
if (exists) {
  console.log(`Updating release ${tag}…`);
  gh("release", "edit", tag, "--notes-file", notesFile);
  gh("release", "upload", tag, ...files, "--clobber");
} else {
  console.log(`Creating release ${tag}…`);
  gh("release", "create", tag, ...files, "--title", `Markdown Studio ${version}`, "--notes-file", notesFile, "--target", "main", "--latest");
}
console.log(gh("release", "view", tag, "--json", "url,assets", "-q", '.url + "\\n" + ([.assets[] | .name + " (" + (.size|tostring) + " bytes)"] | join("\\n"))'));
