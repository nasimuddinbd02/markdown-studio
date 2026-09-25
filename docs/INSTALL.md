# Installing Markdown Studio

Markdown Studio is a free, local-first Markdown editor. Your documents stay on your computer: nothing is uploaded, and no account or internet connection is needed to write.

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
| **Standard**: <!-- installer-link -->[**MarkdownStudio-0.7.0-windows-x64-setup.exe**](../downloads/MarkdownStudio-0.7.0-windows-x64-setup.exe?raw=true)<!-- /installer-link --> | Recommended for almost everyone. If WebView2 is missing, it's downloaded automatically during setup (needs internet only in that case). | ~4 MB |
| **Offline**: <!-- offline-link -->[**MarkdownStudio-0.7.0-windows-x64-offline-setup.exe**](https://github.com/nasimuddinbd02/markdown-studio/releases/download/v0.7.0/MarkdownStudio-0.7.0-windows-x64-offline-setup.exe)<!-- /offline-link --> | The PC has **no internet access**, is locked down, or you're deploying to many machines. It includes the WebView2 runtime, so nothing is downloaded. | ~210 MB |

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

Download the newer installer and run it. It upgrades the existing installation in place. Your settings, recent files and file history are kept. You can see the installed version under **Help → About Markdown Studio**.

### Uninstalling

Open **Settings → Apps → Installed apps** (or **Control Panel → Programs and Features**), find **Markdown Studio**, and choose **Uninstall**. The uninstaller also removes the right-click menu item and file-type registrations. Your documents are never removed. App settings and history are stored in `%APPDATA%\com.markdownstudio.app` and `%LOCALAPPDATA%\com.markdownstudio.app`; delete those folders if you want to remove them too.

### Silent install (IT administrators)

The installer supports unattended installation. Add `/AllUsers` (run elevated) or `/CurrentUser` to choose the scope:

```powershell
.\MarkdownStudio-0.7.0-windows-x64-setup.exe /S /AllUsers
```

To uninstall silently, run `uninstall.exe /S` from the installation folder.

## macOS and Linux

Native builds (`.dmg` for macOS, and `.AppImage` / `.deb` / `.rpm` for Linux) are produced by the project's release workflow on GitHub Actions. Until they are published, build them from source; see [Development](../README.md#development).

## Troubleshooting

| Problem | What to do |
| --- | --- |
| "Windows protected your PC" | Click **More info → Run anyway**. The warning appears because the installer isn't code-signed yet. |
| The browser blocks the download | Choose **Keep** (Edge: **… → Keep → Keep anyway**). |
| A blank window or "WebView2" error | Use the **offline installer**, which includes WebView2, or install the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/), then start the app again. |
| Installer says the app is running | Close Markdown Studio, then run the installer again. |
| Not listed under Installed apps | See the note under *Run the installer*: "Only for me" installs are visible only to the account that installed them. |
| No "Open with Markdown Studio" in the right-click menu | On Windows 11 choose **Show more options**. If it's still missing, reinstall the latest version (0.3.1 or later). |
| Something else went wrong | In the app choose **Help → Export Diagnostic Logs…** and attach the file to an issue. Logs never contain your document text. |
