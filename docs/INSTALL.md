# Installing Markdown Studio

Markdown Studio is a free, local-first Markdown editor. Your documents stay on your computer: nothing is uploaded, and no account or internet connection is needed to write.

## Windows

### Requirements

- Windows 10 (version 1803 or later) or Windows 11, 64-bit (x64)
- About 20 MB of free disk space
- Microsoft Edge WebView2 Runtime. It's already included in Windows 11 and up-to-date Windows 10; if it's missing, the installer downloads it automatically.
- No administrator rights are needed. The app installs for your user account only.

### 1. Download

Download the latest installer: <!-- installer-link -->[**MarkdownStudio-0.3.0-windows-x64-setup.exe**](../downloads/MarkdownStudio-0.3.0-windows-x64-setup.exe?raw=true)<!-- /installer-link -->

On GitHub you can also open the [`downloads`](../downloads/) folder, click the `.exe` file, and then click **Download raw file** (the ⬇ button).

### 2. Check the download (optional)

To confirm the file arrived intact, open **PowerShell** in your Downloads folder and run:

```powershell
Get-FileHash .\MarkdownStudio-*-windows-x64-setup.exe -Algorithm SHA256
```

The hash must match the one in [`downloads/SHA256SUMS.txt`](../downloads/SHA256SUMS.txt) and in the README's download table.

### 3. Run the installer

1. Double-click the downloaded file.
2. The installer isn't code-signed yet, so Windows SmartScreen may show **"Windows protected your PC"**. Click **More info**, then **Run anyway**. Your browser may also ask whether to keep the file; choose **Keep**.
3. Follow the steps (**Next → Install → Finish**).

The app is installed to `%LOCALAPPDATA%\Markdown Studio`, with a Start menu shortcut named **Markdown Studio**.

### 4. Start writing

- Open **Markdown Studio** from the Start menu.
- Choose **New File**, **Open File** or **Open Folder** on the welcome screen.
- `.md` and `.markdown` files are associated with the app, so double-clicking one opens it. If Windows asks which app to use, pick **Markdown Studio** and tick **Always use this app**.
- Press **F1** or **Ctrl+Shift+P** to search every command. **Help → Keyboard Shortcuts** lists all shortcuts.

### Updating

Download the newer installer and run it. It upgrades the existing installation in place. Your settings, recent files and file history are kept. You can see the installed version under **Help → About Markdown Studio**.

### Uninstalling

Open **Settings → Apps → Installed apps**, find **Markdown Studio**, and choose **Uninstall**. Your documents are never removed. App settings and history are stored in `%APPDATA%\com.markdownstudio.app` and `%LOCALAPPDATA%\com.markdownstudio.app`; delete those folders if you want to remove them too.

### Silent install (IT administrators)

The installer supports unattended installation for the current user:

```powershell
.\MarkdownStudio-0.3.0-windows-x64-setup.exe /S
```

## macOS and Linux

Native builds (`.dmg` for macOS, and `.AppImage` / `.deb` / `.rpm` for Linux) are produced by the project's release workflow on GitHub Actions. Until they are published, build them from source; see [Development](../README.md#development).

## Troubleshooting

| Problem | What to do |
| --- | --- |
| "Windows protected your PC" | Click **More info → Run anyway**. The warning appears because the installer isn't code-signed yet. |
| The browser blocks the download | Choose **Keep** (Edge: **… → Keep → Keep anyway**). |
| A blank window or "WebView2" error | Install the [Microsoft Edge WebView2 Runtime](https://developer.microsoft.com/microsoft-edge/webview2/) and start the app again. |
| Installer says the app is running | Close Markdown Studio, then run the installer again. |
| Something else went wrong | In the app choose **Help → Export Diagnostic Logs…** and attach the file to an issue. Logs never contain your document text. |
