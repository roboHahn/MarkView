# MarkView — Implementation Plan

**Date:** 2026-02-10
**Design:** [markview-design.md](./2026-02-10-markview-design.md)

## Phase 1: Project Scaffolding

### Step 1.1 — Initialize Tauri + Svelte project
- Install Tauri CLI prerequisites (Rust, Node.js)
- Run `npm create tauri-app@latest` with Svelte + TypeScript template
- Verify `npm run tauri dev` opens an empty window
- **Output:** Working Tauri shell with Svelte hello world

### Step 1.2 — Install frontend dependencies
- `npm install codemirror @codemirror/lang-markdown @codemirror/theme-one-dark`
- `npm install markdown-it @types/markdown-it`
- `npm install mermaid`
- **Output:** All deps installed, project builds clean

### Step 1.3 — Set up project structure
- Create `src/components/`, `src/lib/`, `src/styles/` directories
- Create stub files: `types.ts`, `markdown.ts`, `theme.ts`
- Create CSS files: `variables.css`, `global.css`, `codemirror.css`
- **Output:** Empty project skeleton matching design doc

---

## Phase 2: Rust Backend

### Step 2.1 — File system commands
- Create `src-tauri/src/commands.rs`
- Implement `read_directory(path)` — recursive, filters `.md` files, returns `Vec<FileEntry>`
- Implement `read_file(path)` — reads file content as String
- Implement `write_file(path, content)` — writes content to file
- Register all commands in `main.rs`
- **Output:** Tauri commands callable from frontend

### Step 2.2 — Folder dialog
- Implement `open_folder_dialog()` using `tauri::api::dialog`
- Returns `Option<String>` with selected folder path
- **Output:** System folder picker works from frontend

---

## Phase 3: Theme System

### Step 3.1 — CSS variables and global styles
- Define dark/light CSS variables in `variables.css`
- Set up `global.css` with reset, font (system monospace for editor, sans-serif for UI)
- Implement `data-theme` attribute on `<html>` element
- **Output:** Theme variables available throughout the app

### Step 3.2 — Theme toggle logic
- Implement `theme.ts` — detect system preference, read/write localStorage, toggle function
- Apply theme on app startup
- **Output:** Theme persists across sessions

---

## Phase 4: Core UI Layout

### Step 4.1 — App.svelte layout
- Three-panel layout with CSS Grid
- File tree (left, 200px default), editor (center), preview (right)
- Status bar at the bottom
- Import global styles
- **Output:** Three empty panels visible

### Step 4.2 — Draggable splitters
- Implement resize handles between panels
- Mouse drag adjusts panel widths
- Min/max width constraints (file tree: 150-400px, editor/preview: 200px min)
- **Output:** Panels are resizable

### Step 4.3 — Toolbar
- Implement `Toolbar.svelte`
- "Open Folder" button — calls `open_folder_dialog` Tauri command
- "Save" button — calls `write_file` Tauri command
- **Output:** Toolbar with working buttons

---

## Phase 5: File Tree

### Step 5.1 — FileTree component
- Implement `FileTree.svelte`
- Receives `FileEntry[]` from Rust backend
- Recursive rendering: folders expandable/collapsible, files clickable
- Highlight active file
- Icons for folders (open/closed) and .md files (text-based, no icon library)
- **Output:** File tree displays and navigates .md files

### Step 5.2 — Connect to App state
- On folder open: call `read_directory`, populate file tree
- On file click: call `read_file`, load content into editor
- Track `currentFile` path in App state
- **Output:** Full flow: open folder → click file → content loads

---

## Phase 6: Markdown Editor

### Step 6.1 — CodeMirror setup
- Implement `Editor.svelte` with CodeMirror 6
- Markdown language support (`@codemirror/lang-markdown`)
- Dark theme (`@codemirror/theme-one-dark`), light theme variant
- Bind editor content to App state
- **Output:** CodeMirror editor with MD syntax highlighting

### Step 6.2 — Editor keybindings
- Ctrl+S — save file (invoke Tauri `write_file`)
- Ctrl+B — wrap selection in `**bold**`
- Ctrl+I — wrap selection in `*italic*`
- **Output:** Keyboard shortcuts work in editor

### Step 6.3 — Sync theme with CodeMirror
- Switch CodeMirror theme when app theme toggles
- **Output:** Editor theme matches app theme

---

## Phase 7: Live Preview

### Step 7.1 — Markdown rendering
- Implement `markdown.ts` — configure markdown-it instance
- Enable HTML, linkify, typographer options
- Implement `Preview.svelte` — renders HTML from markdown-it output
- Debounce editor changes (300ms) before re-rendering
- Style rendered HTML (headings, lists, code blocks, tables, links)
- **Output:** Live preview updates as you type

### Step 7.2 — Mermaid integration
- Configure markdown-it to detect ```` ```mermaid ```` code blocks
- Replace mermaid code blocks with `<div class="mermaid">` containers
- After HTML render, call `mermaid.run()` on the preview container
- Handle mermaid parse errors gracefully (show error inline)
- **Output:** Mermaid diagrams render in preview

### Step 7.3 — Scroll sync (optional, nice to have)
- Sync scroll position between editor and preview
- Approximate line-to-element mapping
- **Output:** Scrolling editor scrolls preview proportionally

---

## Phase 8: Status Bar

### Step 8.1 — StatusBar component
- Implement `StatusBar.svelte`
- Display: current file path, word count, character count
- Theme toggle button (sun/moon icon, text-based)
- Update reactively when file changes or content is edited
- **Output:** Status bar shows live file info and theme toggle

---

## Phase 9: Polish and Error Handling

### Step 9.1 — Toast notifications
- Simple toast system for error/success messages
- File save confirmation, file read errors
- Auto-dismiss after 3 seconds
- **Output:** User gets feedback on actions

### Step 9.2 — Empty states
- No folder opened: welcome screen with "Open Folder" prompt
- Folder has no .md files: "No markdown files found" message
- No file selected: placeholder in editor/preview
- **Output:** App handles all empty states gracefully

### Step 9.3 — Window configuration
- Set window title to "MarkView — {folder name}"
- Set minimum window size (800x600)
- Configure app icon
- **Output:** Professional window appearance

---

## Phase 10: Build and Package

### Step 10.1 — Production build
- Run `npm run tauri build`
- Test .msi installer on clean Windows
- Verify all features work in production build
- **Output:** Distributable Windows installer

---

## Implementation Order Summary

| Phase | Description              | Depends On | Estimated Complexity |
|-------|--------------------------|------------|---------------------|
| 1     | Project scaffolding      | —          | Low                 |
| 2     | Rust backend             | Phase 1    | Low                 |
| 3     | Theme system             | Phase 1    | Low                 |
| 4     | Core UI layout           | Phase 1    | Medium              |
| 5     | File tree                | Phase 2, 4 | Medium              |
| 6     | Markdown editor          | Phase 3, 4 | Medium              |
| 7     | Live preview             | Phase 6    | Medium              |
| 8     | Status bar               | Phase 4    | Low                 |
| 9     | Polish & error handling  | Phase 5-8  | Low                 |
| 10    | Build & package          | Phase 9    | Low                 |

**Parallelizable:** Phase 3 (theme) can run in parallel with Phase 2 (Rust backend). Phase 5 (file tree) and Phase 6 (editor) can partially overlap. Phase 8 (status bar) can be built alongside Phase 7 (preview).
