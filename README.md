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
- **Code folding** — collapse markdown sections by heading level
- **Autocomplete** — markdown syntax autocompletion
- **Image paste** — paste images from clipboard, auto-saved to assets folder
- **Table editor** — visual WYSIWYG table builder with live markdown preview
- **Snippet templates** — quick-insert markdown patterns (tables, checklists, frontmatter...)
- **Emoji picker** — searchable grid of ~100 emojis
- **Minimap** — toggleable code overview panel (CodeMirror canvas overlay)
- **Inline image preview** — toggleable image rendering directly in the editor

### Preview
- **Mermaid diagrams** — rendered automatically in preview with interactive viewer
- **Mermaid editor** — live diagram editor with templates, supports opening selected text
- **Diagram export** — SVG/PNG export from hover toolbar or fullscreen viewer
- **KaTeX math** — LaTeX formulas (`$...$` inline, `$$...$$` display)
- **Checkboxes** — task lists with `- [ ]` / `- [x]` rendered as checkboxes
- **Footnotes** — `[^1]` references with footnote text at bottom
- **Wiki Links** — `[[target]]` and `[[target|alias]]` syntax with clickable links
- **Custom preview CSS** — user-defined styles for preview panel
- **Presentation mode** — fullscreen slideshow from `---` separated slides (Ctrl+Shift+M)

### Navigation
- **File tree** — open folders and browse `.md` files with context menu (rename, delete, create)
- **Tabs** — multiple open files with unsaved change indicators
- **Table of Contents** — auto-generated from headings, click to navigate
- **Breadcrumb** — file path navigation above editor
- **Recent files** — quick access to recently opened files and folders
- **Command Palette** — VS Code-style searchable command list (Ctrl+Shift+P)
- **Backlinks panel** — shows all files linking to the current file via wiki links
- **Graph View** — force-directed graph visualization of wiki link connections (Ctrl+Shift+G)
- **Mind Map** — SVG tree layout generated from document headings (Ctrl+Shift+O)

### Tools
- **Full-text search** — search across all `.md` files (Ctrl+Shift+F)
- **Git integration** — status, branch info, commit, and color-coded diff view
- **Export HTML** — save as standalone HTML file
- **Print to PDF** — browser print dialog for PDF output
- **DOCX export** — export to Microsoft Word format
- **AI helper** — sidebar panel for AI-assisted writing (Ctrl+Shift+A)
- **Image manager** — scan, gallery view, insert, delete, and usage tracking for images (Ctrl+Shift+I)
- **Templates** — 6 built-in templates + custom templates saved to localStorage (Ctrl+Shift+N)

### Plugin System
Fully integrated plugin architecture with 4 extension points:
- **Markdown plugins** — extend markdown-it with custom syntax
- **Editor extensions** — add CodeMirror extensions
- **Preview transforms** — transform rendered HTML before display
- **Commands** — add commands to the command palette

#### Built-in Plugins (all toggleable via Plugin Manager)
| Plugin | Type | Description |
|--------|------|-------------|
| Reading Time | Preview | Estimated reading time banner at top of preview |
| Code Copy Button | Preview | Copy-to-clipboard button on code blocks |
| Custom Containers | Markdown | `:::note`, `:::warning`, `:::tip`, `:::danger`, `:::info` blocks |
| Heading Anchors | Preview | Clickable `#` anchor links next to headings |
| Highlight Syntax | Markdown | `==highlighted text==` renders as `<mark>` |
| Word Counter | Preview | Word and character count at bottom of preview |

### System
- **8 color themes** — Dark, Light, Solarized Dark/Light, Monokai, Nord, Dracula, GitHub Light
- **File watcher** — auto-reload on external changes (polling, 2s interval)
- **Drag & drop** — drop `.md` files or folders to open
- **Zen mode** — fullscreen distraction-free mode (F11)
- **Settings panel** — font size, tab size, word wrap, auto-save
- **Sidebar toggle** — collapsible sidebar with 6 tabs (Files, Search, Git, ToC, AI, Backlinks)
- **Toast notifications** — success, error, info feedback
- **Status bar** — file path, word count, line info, theme toggle

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
| Ctrl+Shift+A | AI helper panel |
| Ctrl+Shift+B | Backlinks panel |
| Ctrl+Shift+G | Graph View |
| Ctrl+Shift+N | New from template |
| Ctrl+Shift+O | Mind Map |
| Ctrl+Shift+I | Image Gallery |
| F11 | Zen mode |
| Escape | Exit zen mode |

## Tech Stack

- **Tauri 2.x** — Rust desktop framework
- **SvelteKit** — Svelte 5 with runes (`$state`, `$derived`, `$effect`, `$props`)
- **CodeMirror 6** — editor with markdown highlighting, dynamic themes via Compartment
- **markdown-it** — MD to HTML with plugins (KaTeX, task lists, footnotes, wiki links)
- **mermaid.js** — diagram rendering with Shadow DOM isolation
- **KaTeX** — LaTeX math rendering
- **highlight.js** — syntax highlighting in code blocks
- **d3-force / d3-zoom** — graph view physics and interaction

## Project Structure

```
MarkView/
├── src-tauri/
│   └── src/
│       ├── lib.rs          — Tauri app setup, command registration
│       ├── commands.rs     — file operations (read, write, create, delete, rename)
│       ├── search.rs       — full-text search across .md files
│       ├── git.rs          — git status, diff, commit
│       ├── watcher.rs      — file system change detection
│       ├── images.rs       — image save/scan/delete operations
│       └── wiki.rs         — wiki link scanning for backlinks/graph
├── src/
│   ├── routes/
│   │   └── +page.svelte    — main app layout and state management
│   ├── components/         — ~35 Svelte components
│   │   ├── Editor.svelte, Preview.svelte, FileTree.svelte
│   │   ├── CommandPalette.svelte, PluginManager.svelte
│   │   ├── GraphView.svelte, MindMapView.svelte
│   │   ├── MermaidEditor.svelte, DiagramViewer.svelte
│   │   ├── AIPanel.svelte, BacklinksPanel.svelte
│   │   └── ...
│   ├── lib/                — ~20 TypeScript modules
│   │   ├── markdown.ts     — markdown-it setup with plugin support
│   │   ├── plugins.svelte.ts — plugin system manager
│   │   ├── builtin-plugins.ts — 6 built-in plugins
│   │   ├── themes.ts       — 8 theme definitions
│   │   └── ...
│   └── styles/
│       ├── variables.css   — CSS variables for all themes
│       ├── global.css      — reset, fonts, base styles
│       ├── codemirror.css  — CodeMirror theme overrides
│       └── preview.css     — preview panel + plugin styles
├── package.json
├── svelte.config.js
├── vite.config.ts
└── tsconfig.json
```

## Development

```bash
npm install
npx tauri dev
```

## Build

```bash
npx tauri build
```

Output: `src-tauri/target/release/markview.exe` + MSI and NSIS installers.

**Important:** Always use `npx tauri build` — running `cargo build --release` alone will not embed the frontend.
