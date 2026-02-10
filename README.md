# MarkView

Desktop Markdown editor with live preview, built with **Tauri 2** (Rust) + **SvelteKit** (Svelte 5) + **CodeMirror 6**.

## Features

### Editor
- **Split view** — editor with syntax highlighting + live preview side by side
- **Sync scroll** — editor and preview scroll positions synchronized
- **Markdown toolbar** — formatting buttons with SVG icons (bold, italic, heading, link, image, code, lists, quote, hr)
- **Find & Replace** — CodeMirror built-in search (Ctrl+F)
- **Focus mode** — dims inactive paragraphs for distraction-free writing
- **Spell check** — browser-native spell checking in editor
- **Image paste** — paste images from clipboard, auto-saved to assets folder
- **Table editor** — visual WYSIWYG table builder with live markdown preview
- **Snippet templates** — quick-insert markdown patterns (tables, checklists, frontmatter...)
- **Emoji picker** — searchable grid of ~100 emojis

### Preview
- **Mermaid diagrams** — rendered automatically in preview
- **KaTeX math** — LaTeX formulas (`$...$` inline, `$$...$$` display)
- **Checkboxes** — task lists with `- [ ]` / `- [x]` rendered as checkboxes
- **Footnotes** — `[^1]` references with footnote text at bottom
- **Custom preview CSS** — user-defined styles for preview panel
- **Presentation mode** — fullscreen slideshow from `---` separated slides (Ctrl+Shift+M)

### Navigation
- **File tree** — open folders and browse `.md` files with context menu (rename, delete, create)
- **Tabs** — multiple open files with unsaved change indicators
- **Table of Contents** — auto-generated from headings, click to navigate
- **Breadcrumb** — file path navigation above editor
- **Recent files** — quick access to recently opened files and folders
- **Command Palette** — VS Code-style searchable command list (Ctrl+Shift+P)

### Tools
- **Full-text search** — search across all `.md` files (Ctrl+Shift+F)
- **Git integration** — status, branch info, commit, and color-coded diff view
- **Export** — save as standalone HTML or print to PDF
- **Interactive Mermaid editor** — live diagram preview in modal

### System
- **8 color themes** — Dark, Light, Solarized Dark/Light, Monokai, Nord, Dracula, GitHub Light
- **Plugin system** — extensible architecture with enable/disable management
- **File watcher** — auto-reload on external changes
- **Drag & drop** — drop `.md` files or folders to open
- **Zen mode** — fullscreen distraction-free mode (F11)
- **Settings panel** — font size, tab size, word wrap, auto-save
- **Sidebar toggle** — collapsible sidebar (Ctrl+B)

## Keyboard Shortcuts

| Shortcut | Action |
|---|---|
| Ctrl+O | Open folder |
| Ctrl+S | Save file |
| Ctrl+F | Find in editor |
| Ctrl+B | Toggle sidebar |
| Ctrl+D | Git diff view |
| Ctrl+, | Cycle theme (dark/light) |
| Ctrl+Shift+F | Search in files |
| Ctrl+Shift+P | Command Palette |
| Ctrl+Shift+M | Presentation mode |
| F11 | Zen mode |
| Escape | Exit zen mode |

## Tech Stack

- **Tauri 2.x** — Rust desktop framework
- **SvelteKit** — Svelte 5 with runes (`$state`, `$derived`, `$effect`, `$props`)
- **CodeMirror 6** — editor with markdown highlighting, dynamic themes via Compartment
- **markdown-it** — MD to HTML with plugins (KaTeX, task lists, footnotes)
- **mermaid.js** — diagram rendering
- **KaTeX** — LaTeX math rendering

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
