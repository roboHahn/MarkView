# MarkView

Desktop Markdown editor with live preview and Mermaid diagram support.

Built with **Tauri 2** (Rust) + **SvelteKit** (Svelte 5) + **CodeMirror 6**.

## Features

- **Split view** — editor with syntax highlighting + live preview side by side
- **Mermaid diagrams** — rendered automatically in preview
- **File tree** — open folders and browse `.md` files
- **Tabs** — multiple open files with unsaved change indicators
- **Full-text search** — search across all `.md` files (Ctrl+Shift+F)
- **Git integration** — view status, branch, and commit from sidebar
- **Export** — save as standalone HTML or print to PDF
- **File watcher** — auto-reload on external changes
- **Themes** — dark and light mode with toggle (Ctrl+,)
- **Drag & drop** — drop `.md` files or folders to open

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+O | Open folder |
| Ctrl+S | Save file |
| Ctrl+, | Toggle theme |
| Ctrl+Shift+F | Search in files |

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Output: `src-tauri/target/release/markview.exe`
