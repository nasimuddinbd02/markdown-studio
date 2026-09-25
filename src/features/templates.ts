import { backend } from "../services";
import { basename, isInside, isMarkdownPath, join } from "../services/paths";
import { useDocuments } from "../stores/documentsStore";
import { useWorkspace } from "../stores/workspaceStore";
import { notify } from "../stores/uiStore";
import { newDocument } from "./documents";
import { requestReveal } from "./editorBridge";

export interface Template {
  id: string;
  name: string;
  description: string;
  /** Built-in text, or a workspace file read on use. */
  body?: string;
  path?: string;
}

/**
 * Placeholders: {{date}} (2026-09-25), {{time}} (14:05), {{datetime}},
 * {{year}}, {{week}} (ISO week number), {{title}} (the template's name) and
 * {{cursor}} (where the cursor starts; removed from the text).
 */
export const BUILT_IN_TEMPLATES: Template[] = [
  {
    id: "meeting",
    name: "Meeting notes",
    description: "Attendees, agenda, decisions and action items",
    body: `# Meeting notes: {{cursor}}

**Date:** {{date}} {{time}}
**Attendees:**

## Agenda

1.

## Notes

## Decisions

-

## Action items

- [ ] Owner: task (due date)
`,
  },
  {
    id: "readme",
    name: "Project README",
    description: "Overview, install, usage, contributing and license",
    body: `# {{cursor}}Project name

One or two sentences on what this project does and who it's for.

## Features

-

## Getting started

### Prerequisites

### Installation

\`\`\`bash

\`\`\`

## Usage

## Contributing

Pull requests are welcome. For major changes, open an issue first to discuss what you would like to change.

## License
`,
  },
  {
    id: "blog",
    name: "Blog post",
    description: "Front matter (title, date, tags) and a draft outline",
    body: `---
title: "{{cursor}}"
date: {{date}}
tags: []
draft: true
---

Opening paragraph: the hook and what the reader will learn.

## Background

## Main point

## Wrapping up
`,
  },
  {
    id: "adr",
    name: "Decision record (ADR)",
    description: "Context, decision, consequences and alternatives",
    body: `# ADR: {{cursor}}

- **Status:** Proposed
- **Date:** {{date}}
- **Deciders:**

## Context

What is the issue that we're seeing that is motivating this decision?

## Decision

What is the change that we're proposing and/or doing?

## Consequences

What becomes easier or more difficult because of this change?

## Alternatives considered

| Option | Pros | Cons |
| ------ | ---- | ---- |
|        |      |      |
`,
  },
  {
    id: "weekly",
    name: "Weekly status report",
    description: "Highlights, progress, risks and next week's plan",
    body: `# Status report: week {{week}}, {{year}}

**Date:** {{date}}

## Highlights

- {{cursor}}

## Progress

| Workstream | Status | Notes |
| ---------- | ------ | ----- |
|            | On track |     |

## Risks and blockers

> [!WARNING]
> Describe anything that needs attention.

## Next week

- [ ]
`,
  },
  {
    id: "changelog",
    name: "Changelog",
    description: "Keep a Changelog format with an Unreleased section",
    body: `# Changelog

All notable changes to this project are documented in this file.

## [Unreleased]

### Added

- {{cursor}}

### Changed

### Fixed
`,
  },
  {
    id: "journal",
    name: "Daily journal",
    description: "Today's focus, notes and a short reflection",
    body: `# {{date}}

## Today's focus

- [ ] {{cursor}}

## Notes

## Reflection
`,
  },
];

function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

/** Fills placeholders; returns the text and the cursor offset ({{cursor}}, else the end). */
export function fillTemplate(body: string, title: string, now = new Date()): { text: string; cursor: number } {
  const pad = (n: number) => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  const values: Record<string, string> = {
    date,
    time,
    datetime: `${date} ${time}`,
    year: String(now.getFullYear()),
    week: String(isoWeek(now)),
    title,
  };
  const filled = body.replace(/\{\{\s*(date|time|datetime|year|week|title)\s*\}\}/gi, (_, k: string) => values[k.toLowerCase()]);
  const at = filled.search(/\{\{\s*cursor\s*\}\}/i);
  if (at < 0) return { text: filled, cursor: filled.length };
  return { text: filled.replace(/\{\{\s*cursor\s*\}\}/gi, ""), cursor: at };
}

/** Built-in templates plus Markdown files in the workspace's `templates/` folder. */
export async function listTemplates(): Promise<Template[]> {
  const root = useWorkspace.getState().root;
  if (!root) return BUILT_IN_TEMPLATES;
  let files: string[] = [];
  try {
    const dir = join(root, "templates");
    files = (await backend().listWorkspaceFiles(root)).filter((p) => isMarkdownPath(p) && isInside(p, dir));
  } catch {
    // The template list still works without the workspace ones.
  }
  const own: Template[] = files.map((path) => ({
    id: `file:${path}`,
    name: basename(path).replace(/\.(md|markdown)$/i, ""),
    description: "From this folder's templates/",
    path,
  }));
  return [...own, ...BUILT_IN_TEMPLATES];
}

/** Opens a new, unsaved document from a template with the cursor at {{cursor}}. */
export async function newFromTemplate(template: Template) {
  let body = template.body ?? "";
  if (template.path) {
    try {
      body = (await backend().readTextFile(template.path)).content;
    } catch (e) {
      notify("error", `Couldn't read the template “${template.name}”: ${(e as Error).message}`);
      return null;
    }
  }
  const { text, cursor } = fillTemplate(body, template.name);
  const id = newDocument(text);
  const before = text.slice(0, cursor).split("\n");
  requestReveal(id, before.length, before[before.length - 1].length, 0);
  useDocuments.getState().setActive(id);
  return id;
}
