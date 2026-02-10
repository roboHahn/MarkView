# MarkView — Design Document

**Date:** 2026-02-10
**Status:** Approved

## Overview

MarkView is a desktop Markdown viewer and editor with live preview and Mermaid diagram rendering. It opens a folder of `.md` files, displays them in a split-view layout (editor + preview), and renders Mermaid code blocks as SVG diagrams in real-time.

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Desktop  | Tauri 2.x (Rust backend)         |
| Frontend | Svelte 5 + TypeScript             |
| Editor   | CodeMirror 6 (markdown mode)      |
| MD Parse | markdown-it (with plugins)        |
| Diagrams | mermaid.js                        |
| Styling  | CSS variables (dark/light theme)  |
| Build    | Vite                              |

## Layout

```
┌──────────┬───────────────────┬───────────────────┐
│ File     │    MD Editor      │   Live Preview    │
│ Tree     │   (CodeMirror)    │   (HTML render)   │
│          │                   │                   │
│ docs/    │  # Title          │   Title           │
│   a.md   │  Some **bold**    │   Some bold       │
│   b.md   │  ```mermaid       │   [diagram SVG]   │
│ notes/   │  graph LR         │                   │
│   c.md   │    A --> B        │                   │
│          │  ```              │                   │
├──────────┴───────────────────┴───────────────────┤
│ Status bar: file path | word count | theme toggle│
└──────────────────────────────────────────────────┘
```

Three resizable panels: file tree (left), editor (center), preview (right). A status bar at the bottom shows file path, word count, and theme toggle.

## Data Flow

1. User opens a folder via system dialog or toolbar button.
2. Rust backend recursively reads the folder, returns a tree of `.md` files.
3. User clicks a file in the file tree.
4. Rust backend reads file content, sends it to the frontend.
5. Content is displayed in CodeMirror editor.
6. On each edit (debounced 300ms), markdown-it parses the content to HTML.
7. Preview panel renders the HTML. Mermaid code blocks are detected and rendered as SVG via mermaid.js.
8. On save (Ctrl+S), Svelte sends the content to Rust backend, which writes it to disk.

## Components

### Svelte Components

```
src/
├── App.svelte              — main layout, holds app state
├── components/
│   ├── FileTree.svelte     — recursive file tree, filters *.md only
│   ├── Editor.svelte       — CodeMirror 6 wrapper, MD syntax highlighting
│   ├── Preview.svelte      — rendered HTML + mermaid diagrams
│   ├── StatusBar.svelte    — file path, word count, theme toggle
│   └── Toolbar.svelte      — open folder, save, split resize handle
```

### Rust Backend (Tauri Commands)

```rust
#[tauri::command]
fn read_directory(path: String) -> Vec<FileEntry>   // recursive .md file tree

#[tauri::command]
fn read_file(path: String) -> String                // read file content

#[tauri::command]
fn write_file(path: String, content: String)        // save file to disk

#[tauri::command]
fn open_folder_dialog() -> Option<String>            // system folder picker
```

### FileEntry Type

```typescript
interface FileEntry {
  name: string;
  path: string;
  is_directory: boolean;
  children?: FileEntry[];
}
```

## Theme System

Two themes (dark and light) implemented via CSS variables on a `data-theme` attribute.

**Dark theme:**
```css
[data-theme="dark"] {
  --bg-primary: #1e1e2e;
  --bg-editor: #181825;
  --bg-preview: #242438;
  --text-primary: #cdd6f4;
  --text-muted: #6c7086;
  --accent: #89b4fa;
  --border: #313244;
}
```

**Light theme:**
```css
[data-theme="light"] {
  --bg-primary: #ffffff;
  --bg-editor: #fafafa;
  --bg-preview: #f5f5f5;
  --text-primary: #1e1e2e;
  --text-muted: #6c7086;
  --accent: #1e66f5;
  --border: #e0e0e0;
}
```

- Default follows system preference via `prefers-color-scheme` media query.
- User toggle saves preference to `localStorage`.
- CodeMirror receives a matching dark/light theme variant.

## Keyboard Shortcuts

| Shortcut         | Action               |
|------------------|-----------------------|
| `Ctrl+S`         | Save file             |
| `Ctrl+O`         | Open folder           |
| `Ctrl+B`         | Bold selection        |
| `Ctrl+I`         | Italic selection      |
| `Ctrl+Shift+P`   | Toggle preview panel  |
| `Ctrl+,`         | Toggle theme          |

## Error Handling

| Scenario                  | Behavior                                              |
|---------------------------|-------------------------------------------------------|
| File unreadable           | Toast notification, editor stays empty                |
| File unsaveable           | Toast with error message                              |
| Invalid mermaid syntax    | Inline error message in preview (mermaid.js native)   |
| Empty folder              | Friendly empty state: "No markdown files found"       |

## Project Structure

```
MarkView/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── commands.rs
│   │   └── lib.rs
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   └── icons/
├── src/
│   ├── App.svelte
│   ├── main.ts
│   ├── components/
│   │   ├── FileTree.svelte
│   │   ├── Editor.svelte
│   │   ├── Preview.svelte
│   │   ├── StatusBar.svelte
│   │   └── Toolbar.svelte
│   ├── lib/
│   │   ├── markdown.ts      — markdown-it setup + mermaid plugin
│   │   ├── theme.ts         — theme logic, localStorage persistence
│   │   └── types.ts         — FileEntry, AppState types
│   └── styles/
│       ├── variables.css    — CSS variables (dark/light)
│       ├── global.css       — reset, fonts, base styles
│       └── codemirror.css   — CodeMirror theme overrides
├── package.json
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── README.md
```

## Dependencies

**npm:**
- `@tauri-apps/api` — Tauri JS bridge
- `svelte` + `@sveltejs/vite-plugin-svelte`
- `codemirror` + `@codemirror/lang-markdown` + `@codemirror/theme-one-dark`
- `markdown-it` + `@types/markdown-it`
- `mermaid`

**Cargo (Rust):**
- `tauri` + `tauri-build`
- `serde` + `serde_json`

## Build & Run

- **Dev:** `npm run tauri dev` (hot reload)
- **Prod:** `npm run tauri build` (produces .msi installer for Windows)

## MVP Scope

**Included:**
- Open folder, file tree with .md files
- Split view: editor (CodeMirror) + live preview
- Mermaid diagram rendering in preview
- Dark/light theme with toggle
- Save file, keyboard shortcuts
- Draggable panel splitters

**Excluded (future):**
- Search across files
- Tabs / multiple open files
- Export to PDF/HTML
- Git integration
- Interactive Mermaid editor
