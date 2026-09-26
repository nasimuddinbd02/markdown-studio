# Installing Markdown Studio

Markdown Studio is a free, local-first Markdown editor. Your documents stay on your computer: nothing is uploaded, and no account or internet connection is needed to write.

Choose your system: [Windows](#windows) · [macOS](#macos) · [Linux](#linux). Each has its own installer, and none of them needs anything else installed.

## Windows

### Requirements

- Windows 10 (version 1803 or later) or Windows 11, 64-bit (x64)
- About 20 MB of free disk space
- Administrator rights are only needed if you install for everyone on the computer.

**Nothing else needs to be installed.** Markdown Studio is self-contained: its runtime libraries are built in. The only system component it uses is Microsoft Edge **WebView2**, which draws the window. WebView2 is part of Windows 11 and is installed on up-to-date Windows 10 PCs by Windows Update. If it's missing, the installer adds it for you.

### 1. Download

Choose one installer:

| Installer | Use it when | Size |
| --- | --- | --- |
| **Standard**: <!-- installer-link -->[**MarkdownStudio-0.10.0-windows-x64-setup.exe**](../downloads/MarkdownStudio-0.10.0-windows-x64-setup.exe?raw=true)<!-- /installer-link --> | Recommended for almost everyone. If WebView2 is missing, it's downloaded automatically during setup (needs internet only in that case). | ~7 MB |
| **Offline**: <!-- offline-link -->[**MarkdownStudio-0.10.0-windows-x64-offline-setup.exe**](https://github.com/nasimuddinbd02/markdown-studio/releases/download/v0.10.0/MarkdownStudio-0.10.0-windows-x64-offline-setup.exe)<!-- /offline-link --> | The PC has **no internet access**, is locked down, or you're deploying to many machines. It includes the WebView2 runtime, so nothing is downloaded. | ~210 MB |

On GitHub you can also open the [`downloads`](../downloads/) folder, click the `.exe` file, and then click **Download raw file** (the ⬇ button). The offline installer is too large for the repository, so it's published on the project's [Releases page](https://github.com/nasimuddinbd02/markdown-studio/releases/latest).

### 2. Check the download (optional)

To confirm the file arrived intact, open **PowerShell** in your Downloads folder and run:

```powershell
Get-FileHash .\MarkdownStudio-*-windows-x64-setup.exe -Algorithm SHA256
```

The hash must match the one in [`downloads/SHA256SUMS.txt`](../downloads/SHA256SUMS.txt) and in the README's download table.

### 3. Run the installer

1. Double-click the downloaded file.
2. The installer isn't code-signed yet, so Windows SmartScreen may show **"Windows protected your PC"**. Click **More info**, then **Run anyway**. Your browser may also ask whether to keep the file; choose **Keep**.
3. Choose who to install for:
   - **Anyone who uses this computer (all users)**: installs to `C:\Program Files\Markdown Studio`. Windows asks for administrator approval. This is recommended on shared and company PCs.
   - **Only for me**: installs to `%LOCALAPPDATA%\Markdown Studio`. No administrator rights are needed.
4. Follow the remaining steps (**Install → Finish**).

After installation Markdown Studio:

- has a Start menu shortcut named **Markdown Studio**;
- appears in **Settings → Apps → Installed apps** and **Control Panel → Programs and Features** (publisher: Markdown Studio);
- adds **Open with Markdown Studio** to the right-click menu of `.md` and `.markdown` files (on Windows 11 it's under **Show more options**), and lists itself under **Open with**;
- becomes the default app for `.md` files unless you have chosen another one. You can change this in **Settings → Apps → Default apps → Markdown Studio**.

> **Don't see it under Installed apps?** An "Only for me" installation is only visible to the Windows account that installed it. If you ran the installer as a different or administrator account, sign in to that account, or reinstall and choose **Anyone who uses this computer**.

### 4. Start writing

- Open **Markdown Studio** from the Start menu.
- Choose **New File**, **Open File** or **Open Folder** on the welcome screen.
- Double-click a `.md` file, or right-click it and choose **Open with Markdown Studio**. If Windows asks which app to use, pick **Markdown Studio** and tick **Always use this app**.
- Press **F1** or **Ctrl+Shift+P** to search every command. **Help → Keyboard Shortcuts** lists all shortcuts.

### Updating

**From version 0.8.0, Markdown Studio updates itself.** Each time it starts, it asks GitHub whether a newer version has been published. If there is one, it shows the new version and your current one, with three choices:

- **Update Now** saves your open documents, then downloads the new installer. It checks the installer's digital signature against the key built into the app and refuses any file that doesn't match. The installer then replaces the current version in place, and Markdown Studio restarts on the new version. If Markdown Studio was installed for **Anyone who uses this computer**, Windows asks for administrator approval first.
- **Later** asks again the next time Markdown Studio starts.
- **Skip This Version** stops the automatic prompt for that version.

You can also use **Help → Check for Updates…** at any time. To turn off the startup check, clear **Settings → Startup → Check for updates when Markdown Studio starts**. If a download or install fails, the current version keeps running unchanged.

Versions before 0.8.0 can't install updates themselves. Download the newer installer and run it once; it upgrades the existing installation in place. Your settings, recent files and file history are always kept. You can see the installed version under **Help → About Markdown Studio**.

### Uninstalling

Open **Settings → Apps → Installed apps** (or **Control Panel → Programs and Features**), find **Markdown Studio**, and choose **Uninstall**. The uninstaller also removes the right-click menu item and file-type registrations. Your documents are never removed. App settings and history are stored in `%APPDATA%\com.markdownstudio.app` and `%LOCALAPPDATA%\com.markdownstudio.app`; delete those folders if you want to remove them too.

### Silent install (IT administrators)

The installer supports unattended installation. Add `/AllUsers` (run elevated) or `/CurrentUser` to choose the scope:

```powershell
.\MarkdownStudio-0.10.0-windows-x64-setup.exe /S /AllUsers
```

To uninstall silently, run `uninstall.exe /S` from the installation folder.

## macOS

### Requirements

- macOS 10.15 (Catalina) or later.
- A Mac with **Apple Silicon** (M1 and later) or an **Intel** processor. To check, open the Apple menu → **About This Mac**: it shows *Chip: Apple M…* or *Processor: Intel*.
- Nothing else. The app uses the WebKit engine built into macOS.

### Install

1. Download the `.dmg` for your Mac from the [latest release](https://github.com/nasimuddinbd02/markdown-studio/releases/latest): `MarkdownStudio-<version>-macos-arm64.dmg` for Apple Silicon, or `MarkdownStudio-<version>-macos-x64.dmg` for Intel.
2. Open the `.dmg`, then drag **Markdown Studio** onto the **Applications** folder.
3. Start Markdown Studio from **Applications** or Launchpad.

The app isn't notarized by Apple yet, so macOS stops it the first time:

- If macOS says it *"cannot be opened because Apple cannot check it"*, open **System Settings → Privacy & Security**, scroll down, and choose **Open Anyway**. You only need to do this once.
- If macOS says the app *"is damaged and can't be opened"*, the download was quarantined. Run this once in Terminal, then open the app again:

  ```bash
  xattr -dr com.apple.quarantine "/Applications/Markdown Studio.app"
  ```

To open `.md` files with Markdown Studio by default, select a file in Finder, choose **File → Get Info**, pick Markdown Studio under **Open with**, and click **Change All…**.

### Updating and uninstalling

When a new version is published, Markdown Studio tells you at startup (or from **Help → Check for Updates…**) and opens its download page. Download the new `.dmg` and drag the app onto Applications again to replace the old version. Your settings are kept.

To uninstall, drag **Markdown Studio** from Applications to the Trash. Settings and history are in `~/Library/Application Support/com.markdownstudio.app`; delete that folder too if you want to remove them.

## Linux

### Requirements

- A 64-bit (x86_64) distribution from 2022 or later, such as Ubuntu 22.04+, Debian 12+, Fedora 36+ or openSUSE Leap 15.5+.
- The system WebKitGTK library. The `.deb` and `.rpm` packages declare it, so your package manager installs it automatically. The AppImage needs `libwebkit2gtk-4.1`, which current desktop distributions include.

### Install

Download one package from the [latest release](https://github.com/nasimuddinbd02/markdown-studio/releases/latest):

| Package | Distributions | Install |
| --- | --- | --- |
| `MarkdownStudio-<version>-linux-amd64.deb` | Ubuntu, Debian, Linux Mint, Pop!_OS | `sudo apt install ./MarkdownStudio-<version>-linux-amd64.deb` |
| `MarkdownStudio-<version>-linux-x86_64.rpm` | Fedora, RHEL, Rocky, openSUSE | `sudo dnf install ./MarkdownStudio-<version>-linux-x86_64.rpm` (openSUSE: `sudo zypper install ./…rpm`) |
| `MarkdownStudio-<version>-linux-x86_64.AppImage` | Any distribution; no installation or root access needed | `chmod +x MarkdownStudio-*.AppImage`, then run `./MarkdownStudio-<version>-linux-x86_64.AppImage` |

The `.deb` and `.rpm` packages add Markdown Studio to your applications menu and register it for `.md` files.

### Updating and uninstalling

When a new version is published, Markdown Studio tells you at startup and opens its download page. Install the new package the same way; it replaces the old version and keeps your settings. For the AppImage, replace the file.

To uninstall, run `sudo apt remove markdown-studio` or `sudo dnf remove markdown-studio`, or delete the AppImage. Settings and history are in `~/.config/com.markdownstudio.app` and `~/.local/share/com.markdownstudio.app`.

## Checking a download (all platforms)

Every release has `SHA256SUMS.txt` (Windows) and `SHA256SUMS-macos-linux.txt`. Compare them with the checksum of your file: `sha256sum <file>` on Linux, `shasum -a 256 <file>` on macOS, or `Get-FileHash <file>` in PowerShell on Windows.

## Troubleshooting

| Problem | What to do |
| --- | --- |
| "Windows protected your PC" | Click **More info → Run anyway**. The warning appears because the installer isn't code-signed yet. |
| The browser blocks the download | Choose **Keep** (Edge: **… → Keep → Keep anyway**). |
| A blank window or "WebView2" error | Use the **offline installer**, which includes WebView2, or install the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/), then start the app again. |
| Installer says the app is running | Close Markdown Studio, then run the installer again. |
| Not listed under Installed apps | See the note under *Run the installer*: "Only for me" installs are visible only to the account that installed them. |
| No "Open with Markdown Studio" in the right-click menu | On Windows 11 choose **Show more options**. If it's still missing, reinstall the latest version (0.3.1 or later). |
| macOS: "cannot be opened because Apple cannot check it" | **System Settings → Privacy & Security → Open Anyway** (once). The app isn't notarized yet. |
| macOS: "Markdown Studio is damaged" | Run `xattr -dr com.apple.quarantine "/Applications/Markdown Studio.app"` in Terminal, then open it again. |
| Linux: the AppImage doesn't start | Make it executable (`chmod +x`). If it reports a missing `libwebkit2gtk-4.1`, install that package, or use the `.deb`/`.rpm`, which install it automatically. |
| Linux: `apt` says the package can't be found | Include the `./` path: `sudo apt install ./MarkdownStudio-<version>-linux-amd64.deb`. |
| Something else went wrong | In the app choose **Help → Export Diagnostic Logs…** and attach the file to an issue. Logs never contain your document text. |
