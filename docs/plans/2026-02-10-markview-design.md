# MarkView — Design Document

**Date:** 2026-02-10
**Last updated:** 2026-02-11
**Status:** Implemented

## Overview

MarkView is a desktop Markdown editor and viewer with live preview, built with Tauri 2.x (Rust backend) + SvelteKit (Svelte 5 frontend) + CodeMirror 6. It opens a folder of `.md` files, displays them in a split-view layout (editor + preview), and renders Mermaid diagrams, KaTeX math, wiki links, and more.

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Desktop  | Tauri 2.x (Rust backend)         |
| Frontend | SvelteKit + Svelte 5 + TypeScript |
| Editor   | CodeMirror 6 (markdown mode)      |
| MD Parse | markdown-it (with plugins)        |
| Diagrams | mermaid.js (Shadow DOM isolated)  |
| Math     | KaTeX                             |
| Graphs   | d3-force, d3-zoom                 |
| Styling  | CSS variables (8 themes)          |
| Build    | Vite + Tauri CLI                  |

## Layout

```
┌──────────┬───────────────────┬───────────────────┐
│ Sidebar  │    MD Editor      │   Live Preview    │
│ (6 tabs) │   (CodeMirror)    │   (HTML render)   │
│          │                   │                   │
│ Files    │  # Title          │   Title           │
│ Search   │  Some **bold**    │   Some bold       │
│ Git      │  ```mermaid       │   [diagram SVG]   │
│ ToC      │  graph LR         │                   │
│ AI       │    A --> B        │                   │
│ Links    │  ```              │                   │
├──────────┴───────────────────┴───────────────────┤
│ Status bar: file path | word count | theme toggle│
└──────────────────────────────────────────────────┘
```

Three resizable panels: sidebar (left, 6 tabs), editor (center), preview (right). Toolbar at top with formatting and feature buttons. Status bar at bottom.

## Data Flow

1. User opens a folder via system dialog or toolbar button.
2. Rust backend recursively reads the folder, returns a tree of `.md` files.
3. User clicks a file in the file tree (opens in a tab).
4. Rust backend reads file content, sends it to the frontend.
5. Content is displayed in CodeMirror editor.
6. On each edit (debounced 300ms), markdown-it parses the content to HTML.
7. Plugin markdown-it extensions are applied. Preview transforms run on the HTML.
8. Preview panel renders the HTML. Mermaid code blocks are rendered as SVG via mermaid.js.
9. On save (Ctrl+S), Svelte sends the content to Rust backend, which writes it to disk.
10. File watcher detects external changes and auto-reloads if no unsaved edits.

## Rust Backend (Tauri Commands)

```rust
// File operations (commands.rs)
read_directory(path)        // recursive .md file tree
read_file(path)             // read file content
write_file(path, content)   // save file
create_file(path)           // create new .md file
delete_file(path)           // delete file
rename_file(old, new)       // rename/move file
write_binary_file(path, data) // write binary (images)

// Search (search.rs)
search_files(folder, query) // full-text search across .md files

// Git (git.rs)
git_status(folder)          // status + branch info
git_diff(folder, file)      // file diff
git_commit(folder, message) // commit changes

// File watcher (watcher.rs)
start_watching(folder)      // begin polling for changes
stop_watching()             // stop file watcher

// Images (images.rs)
save_image(folder, filename, data)  // save pasted/dropped image
scan_images(folder)                 // list all images in folder
delete_image(path)                  // delete image file

// Wiki (wiki.rs)
scan_wiki_links(folder)     // scan all .md files for [[...]] links
```

## Plugin System

Fully integrated plugin architecture managed by `PluginManager` class in `plugins.svelte.ts`.

### Extension Points
1. **markdownPlugin** — function passed to `md.use()`, extends markdown-it parsing
2. **editorExtension** — CodeMirror 6 extension, reconfigured via Compartment
3. **previewTransform** — `(html: string) => string`, applied after markdown rendering
4. **commands** — array of `{ id, name, execute }` merged into Command Palette

### Lifecycle
- Plugins register on app mount via `pluginManager.register()`
- Enabled state persisted in localStorage
- `onActivate()` / `onDeactivate()` lifecycle hooks
- Markdown-it instance rebuilt when markdown plugins toggle

### Built-in Plugins
- Reading Time, Code Copy Button, Custom Containers, Heading Anchors, Highlight Syntax, Word Counter

## Theme System

8 themes implemented via CSS variables on `data-theme` attribute:
Dark, Light, Solarized Dark, Solarized Light, Monokai, Nord, Dracula, GitHub Light.

User selection saved to localStorage. CodeMirror receives matching theme variant via Compartment.

## Keyboard Shortcuts

| Shortcut         | Action               |
|------------------|-----------------------|
| Ctrl+S           | Save file             |
| Ctrl+O           | Open folder           |
| Ctrl+B           | Toggle sidebar        |
| Ctrl+D           | Git diff              |
| Ctrl+F           | Find in editor        |
| Ctrl+,           | Cycle theme           |
| Ctrl+Shift+F     | Search in files       |
| Ctrl+Shift+P     | Command Palette       |
| Ctrl+Shift+M     | Presentation mode     |
| Ctrl+Shift+A     | AI helper             |
| Ctrl+Shift+B     | Backlinks             |
| Ctrl+Shift+G     | Graph View            |
| Ctrl+Shift+N     | New from template     |
| Ctrl+Shift+O     | Mind Map              |
| Ctrl+Shift+I     | Image Gallery         |
| F11              | Zen mode              |

## Build & Run

- **Dev:** `npx tauri dev` (hot reload)
- **Prod:** `npx tauri build` (produces .exe + .msi + NSIS installer)
- **Important:** Always use `npx tauri build`, not `cargo build --release`
