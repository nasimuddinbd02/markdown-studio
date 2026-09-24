/** Sample workspace used when the UI runs in a browser without the native shell. */
export const DEMO_FILES: Record<string, string> = {
  "/demo/README.md": `# Welcome to Markdown Studio

Markdown Studio is a **local-first** Markdown editor with live preview.

> You're running the browser demo. Files here live in your browser only.
> Install the desktop app to edit files on your computer.

## GitHub Flavored Markdown

| Feature        | Supported |
| -------------- | :-------: |
| Tables         |    ✅     |
| Task lists     |    ✅     |
| ~~Strikethrough~~ |  ✅     |
| Autolinks      |    ✅     |

### Task list

- [x] Create a document
- [x] Preview it
- [ ] Save it with **Ctrl/Cmd+S**

### Code

\`\`\`ts
export function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`

### Links and images

Visit https://tauri.app or read the [guide](docs/guide.md).

![Logo](assets/logo.svg)

Unicode works too: héllo, 世界, 🚀.
`,
  "/demo/docs/guide.md": `# Guide

## Keyboard shortcuts

| Action | Shortcut |
| --- | --- |
| New document | Ctrl/Cmd+N |
| Open file | Ctrl/Cmd+O |
| Open folder | Ctrl/Cmd+Shift+O |
| Save | Ctrl/Cmd+S |
| Save As | Ctrl/Cmd+Shift+S |
| Close tab | Ctrl/Cmd+W |
| Next / previous tab | Ctrl+Tab / Ctrl+Shift+Tab |
| Find / Replace | Ctrl/Cmd+F / Ctrl/Cmd+H |
| Go to line | Ctrl/Cmd+G |
| Toggle view mode | Ctrl/Cmd+\\\\ |
| Settings | Ctrl/Cmd+, |

[Back to README](../README.md)
`,
  "/demo/docs/security-test.md": `# Unsafe content test

The preview must not run scripts (SEC-004).

<script>alert("xss")</script>

<img src="x" onerror="alert('xss')">

[javascript link](javascript:alert('xss'))

<iframe src="https://example.com"></iframe>

<details><summary>Safe HTML is kept</summary>

This <kbd>Ctrl</kbd> + <kbd>S</kbd> text is inside a sanitized details element.

</details>
`,
  "/demo/notes/todo.md": `# Todo

- [ ] Write release notes
- [ ] Test on Windows, macOS and Linux
`,
  "/demo/assets/logo.svg": `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="96" height="96"><rect width="64" height="64" rx="14" fill="#2f5bea"/><path d="M12 44V20h6l7 9 7-9h6v24h-6V30l-7 9-7-9v14z" fill="#fff"/><path d="M44 20h6v14h5l-8 10-8-10h5z" fill="#fff"/></svg>`,
};
