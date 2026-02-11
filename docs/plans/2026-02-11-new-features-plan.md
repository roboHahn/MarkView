# MarkView New Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add 5 feature groups to MarkView: interactive diagrams, DOCX export, section folding, autocomplete, and AI helper.

**Architecture:** Each feature is independent and can be implemented in parallel. Features 1-3 (folding, autocomplete, DOCX) are frontend-only. Feature 4 (diagrams) modifies Preview. Feature 5 (AI) adds Rust backend HTTP proxy + frontend provider abstraction + UI panel.

**Tech Stack:** Svelte 5, CodeMirror 6, `docx` npm, `@codemirror/autocomplete`, `@codemirror/language` (foldGutter), `reqwest` (Rust HTTP), mermaid.js SVG export

---

## Feature 1: Section Folding

### Task 1.1: Install folding dependencies and create fold service

**Files:**
- Modify: `src/components/Editor.svelte:1-10` (imports)
- Create: `src/lib/markdown-fold.ts`

**Step 1: Create the markdown fold service**

Create `src/lib/markdown-fold.ts`:

```typescript
import { foldService } from '@codemirror/language';
import type { EditorState } from '@codemirror/state';

/**
 * Custom fold service for Markdown.
 * - Headings fold everything until next heading of same/higher level
 * - Fenced code blocks (```) fold between opening and closing fences
 */
export function markdownFoldService() {
  return foldService.of((state: EditorState, lineStart: number, lineEnd: number) => {
    const line = state.doc.lineAt(lineStart);
    const text = line.text;

    // Check for heading: # ... ## ... etc.
    const headingMatch = text.match(/^(#{1,6})\s/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      // Find next heading of same or higher level
      let end = line.to;
      for (let i = line.number + 1; i <= state.doc.lines; i++) {
        const nextLine = state.doc.line(i);
        const nextMatch = nextLine.text.match(/^(#{1,6})\s/);
        if (nextMatch && nextMatch[1].length <= level) {
          // Fold up to the line before this heading
          end = state.doc.line(i - 1).to;
          break;
        }
        end = nextLine.to;
      }
      if (end > line.to) {
        return { from: line.to, to: end };
      }
    }

    // Check for fenced code block: ```
    if (text.match(/^`{3,}/)) {
      for (let i = line.number + 1; i <= state.doc.lines; i++) {
        const nextLine = state.doc.line(i);
        if (nextLine.text.match(/^`{3,}\s*$/)) {
          return { from: line.to, to: nextLine.to };
        }
      }
    }

    return null;
  });
}
```

**Step 2: Add folding to Editor.svelte**

In `src/components/Editor.svelte`, add imports:

```typescript
import { foldGutter, foldKeymap } from '@codemirror/language';
import { markdownFoldService } from '$lib/markdown-fold';
```

Add to the extensions array (inside `EditorState.create`, after `search()`):

```typescript
foldGutter(),
markdownFoldService(),
```

Add to keymap array:

```typescript
...foldKeymap,
```

**Step 3: Verify**

Run: `npm run check`
Expected: No TypeScript errors

**Step 4: Test manually**

Run: `npm run tauri dev`
- Open a .md file with headings — verify fold gutters (▸) appear
- Click ▸ to fold a section — content should collapse
- Use Ctrl+Shift+[ / ] for fold/unfold keyboard shortcuts
- Code blocks should also be foldable

---

## Feature 2: Autocomplete

### Task 2.1: Install autocomplete dependency

**Step 1: Install**

Run: `npm install @codemirror/autocomplete`

**Step 2: Verify**

Run: `npm run check`

### Task 2.2: Create autocomplete sources

**Files:**
- Create: `src/lib/autocomplete.ts`

**Step 1: Create autocomplete source file**

Create `src/lib/autocomplete.ts`:

```typescript
import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';

interface SnippetItem {
  label: string;
  detail: string;
  template: string;
  cursorOffset?: number; // offset from start of inserted text
}

const markdownSnippets: SnippetItem[] = [
  { label: '# Heading 1', detail: 'H1', template: '# ' },
  { label: '## Heading 2', detail: 'H2', template: '## ' },
  { label: '### Heading 3', detail: 'H3', template: '### ' },
  { label: '#### Heading 4', detail: 'H4', template: '#### ' },
  { label: '**Bold**', detail: 'Bold text', template: '**text**', cursorOffset: 2 },
  { label: '*Italic*', detail: 'Italic text', template: '*text*', cursorOffset: 1 },
  { label: '[Link](url)', detail: 'Hyperlink', template: '[text](url)', cursorOffset: 1 },
  { label: '![Image](url)', detail: 'Image', template: '![alt](url)', cursorOffset: 2 },
  { label: '```Code Block```', detail: 'Fenced code', template: '```\n\n```', cursorOffset: 4 },
  { label: '```mermaid', detail: 'Mermaid diagram', template: '```mermaid\ngraph TD\n    A[Start] --> B[End]\n```', cursorOffset: 14 },
  { label: '- [ ] Task', detail: 'Task list item', template: '- [ ] ' },
  { label: '> Blockquote', detail: 'Quote', template: '> ' },
  { label: '---', detail: 'Horizontal rule', template: '---\n' },
  { label: '| Table |', detail: 'Table', template: '| Header 1 | Header 2 |\n| --- | --- |\n| Cell 1 | Cell 2 |', cursorOffset: 2 },
  { label: '[^footnote]', detail: 'Footnote', template: '[^1]: ' },
  { label: '- List item', detail: 'Bullet list', template: '- ' },
  { label: '1. Ordered', detail: 'Numbered list', template: '1. ' },
];

function markdownCompletions(context: CompletionContext): CompletionResult | null {
  // Trigger on `/` at start of input or after whitespace
  const triggerMatch = context.matchBefore(/\/\w*/);
  if (!triggerMatch && !context.explicit) return null;

  const from = triggerMatch ? triggerMatch.from : context.pos;

  return {
    from,
    options: markdownSnippets.map(s => ({
      label: s.label,
      detail: s.detail,
      apply: (view, completion, from, to) => {
        view.dispatch({
          changes: { from, to, insert: s.template },
          selection: s.cursorOffset
            ? { anchor: from + s.cursorOffset }
            : { anchor: from + s.template.length }
        });
      }
    })),
    filter: true
  };
}

// --- Mermaid completions ---

interface MermaidKeyword {
  label: string;
  detail: string;
  type?: string;
}

const mermaidDiagramTypes: MermaidKeyword[] = [
  { label: 'graph TD', detail: 'Top-down flowchart' },
  { label: 'graph LR', detail: 'Left-right flowchart' },
  { label: 'graph BT', detail: 'Bottom-top flowchart' },
  { label: 'graph RL', detail: 'Right-left flowchart' },
  { label: 'sequenceDiagram', detail: 'Sequence diagram' },
  { label: 'classDiagram', detail: 'Class diagram' },
  { label: 'stateDiagram-v2', detail: 'State diagram' },
  { label: 'gantt', detail: 'Gantt chart' },
  { label: 'pie', detail: 'Pie chart' },
  { label: 'erDiagram', detail: 'Entity-relationship' },
  { label: 'flowchart TD', detail: 'Flowchart top-down' },
  { label: 'flowchart LR', detail: 'Flowchart left-right' },
  { label: 'gitGraph', detail: 'Git graph' },
  { label: 'mindmap', detail: 'Mind map' },
  { label: 'timeline', detail: 'Timeline' },
];

const flowchartKeywords: MermaidKeyword[] = [
  { label: '-->', detail: 'Arrow link' },
  { label: '---', detail: 'Open link' },
  { label: '-.->',  detail: 'Dotted link' },
  { label: '==>', detail: 'Thick link' },
  { label: 'subgraph', detail: 'Subgraph block' },
  { label: 'end', detail: 'End subgraph' },
  { label: 'click', detail: 'Click event' },
  { label: 'style', detail: 'Node style' },
  { label: 'classDef', detail: 'Class definition' },
];

const sequenceKeywords: MermaidKeyword[] = [
  { label: 'participant', detail: 'Define participant' },
  { label: 'actor', detail: 'Define actor' },
  { label: '->>', detail: 'Solid arrow' },
  { label: '->>>', detail: 'Solid arrow (open)' },
  { label: '-->>', detail: 'Dashed arrow' },
  { label: 'Note right of', detail: 'Note right' },
  { label: 'Note left of', detail: 'Note left' },
  { label: 'Note over', detail: 'Note over' },
  { label: 'loop', detail: 'Loop block' },
  { label: 'alt', detail: 'Alternative block' },
  { label: 'else', detail: 'Else branch' },
  { label: 'opt', detail: 'Optional block' },
  { label: 'par', detail: 'Parallel block' },
  { label: 'activate', detail: 'Activate lifeline' },
  { label: 'deactivate', detail: 'Deactivate lifeline' },
];

const classKeywords: MermaidKeyword[] = [
  { label: 'class', detail: 'Define class' },
  { label: '<|--', detail: 'Inheritance' },
  { label: '*--', detail: 'Composition' },
  { label: 'o--', detail: 'Aggregation' },
  { label: '-->', detail: 'Association' },
  { label: '..>', detail: 'Dependency' },
  { label: '..|>', detail: 'Realization' },
  { label: '<<interface>>', detail: 'Interface stereotype' },
  { label: '<<abstract>>', detail: 'Abstract stereotype' },
];

const ganttKeywords: MermaidKeyword[] = [
  { label: 'title', detail: 'Chart title' },
  { label: 'dateFormat', detail: 'Date format' },
  { label: 'section', detail: 'Section' },
  { label: 'axisFormat', detail: 'Axis format' },
];

function detectMermaidType(state: any, pos: number): string | null {
  // Walk backwards from pos to find the ```mermaid fence
  for (let i = state.doc.lineAt(pos).number - 1; i >= 1; i--) {
    const lineText = state.doc.line(i).text.trim();
    if (lineText.startsWith('```') && !lineText.startsWith('```mermaid')) {
      return null; // hit a different code fence
    }
    if (lineText === '```mermaid') {
      // Now check the line after ```mermaid for diagram type
      if (i + 1 <= state.doc.lines) {
        const typeLine = state.doc.line(i + 1).text.trim();
        if (typeLine.startsWith('graph') || typeLine.startsWith('flowchart')) return 'flowchart';
        if (typeLine.startsWith('sequenceDiagram')) return 'sequence';
        if (typeLine.startsWith('classDiagram')) return 'class';
        if (typeLine.startsWith('gantt')) return 'gantt';
        if (typeLine.startsWith('stateDiagram')) return 'state';
        return 'unknown';
      }
      return 'unknown';
    }
  }
  return null;
}

function isInsideMermaidBlock(state: any, pos: number): boolean {
  return detectMermaidType(state, pos) !== null;
}

function mermaidCompletions(context: CompletionContext): CompletionResult | null {
  if (!isInsideMermaidBlock(context.state, context.pos)) return null;

  const word = context.matchBefore(/\S*/);
  if (!word && !context.explicit) return null;
  const from = word ? word.from : context.pos;

  const diagramType = detectMermaidType(context.state, context.pos);

  let keywords: MermaidKeyword[] = [...mermaidDiagramTypes];
  switch (diagramType) {
    case 'flowchart': keywords = [...keywords, ...flowchartKeywords]; break;
    case 'sequence': keywords = [...keywords, ...sequenceKeywords]; break;
    case 'class': keywords = [...keywords, ...classKeywords]; break;
    case 'gantt': keywords = [...keywords, ...ganttKeywords]; break;
  }

  return {
    from,
    options: keywords.map(k => ({
      label: k.label,
      detail: k.detail,
      type: 'keyword'
    })),
    filter: true
  };
}

/**
 * Returns a CodeMirror autocompletion extension configured for
 * Markdown syntax and Mermaid diagram completions.
 */
export function markdownAutocompletion() {
  return autocompletion({
    override: [markdownCompletions, mermaidCompletions],
    defaultKeymap: true,
  });
}
```

**Step 2: Verify**

Run: `npm run check`

### Task 2.3: Wire autocomplete into Editor

**Files:**
- Modify: `src/components/Editor.svelte:1-10` (add import)
- Modify: `src/components/Editor.svelte:199-201` (add extension)

**Step 1: Add import**

In `Editor.svelte`, add:

```typescript
import { markdownAutocompletion } from '$lib/autocomplete';
```

**Step 2: Add extension**

In the extensions array (after `markdownFoldService()`), add:

```typescript
markdownAutocompletion(),
```

**Step 3: Verify**

Run: `npm run check`
Run: `npm run tauri dev`
- Type `/` in editor — autocomplete popup should appear
- Inside a ```mermaid block, type `se` — should suggest `sequenceDiagram`

---

## Feature 3: DOCX Export

### Task 3.1: Install docx dependency

**Step 1: Install**

Run: `npm install docx file-saver`
Run: `npm install -D @types/file-saver`

**Step 2: Verify**

Run: `npm run check`

### Task 3.2: Create DOCX export logic

**Files:**
- Create: `src/lib/docx-export.ts`

**Step 1: Create the conversion file**

Create `src/lib/docx-export.ts`:

```typescript
import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, TabStopPosition, TabStopType,
  ExternalHyperlink
} from 'docx';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import MarkdownIt from 'markdown-it';

// Create a minimal markdown-it instance just for tokenizing
const md = new MarkdownIt();

type Token = ReturnType<typeof md.parse>[number];

/**
 * Convert markdown-it inline tokens to TextRun array
 */
function inlineToRuns(children: Token[]): TextRun[] {
  const runs: TextRun[] = [];
  let bold = false;
  let italic = false;
  let code = false;

  for (const child of children) {
    switch (child.type) {
      case 'text':
        runs.push(new TextRun({
          text: child.content,
          bold, italics: italic,
          font: code ? 'Consolas' : undefined,
          shading: code ? { type: ShadingType.SOLID, color: 'E8E8E8' } : undefined,
        }));
        break;
      case 'code_inline':
        runs.push(new TextRun({
          text: child.content,
          font: 'Consolas',
          shading: { type: ShadingType.SOLID, color: 'E8E8E8' },
        }));
        break;
      case 'strong_open': bold = true; break;
      case 'strong_close': bold = false; break;
      case 'em_open': italic = true; break;
      case 'em_close': italic = false; break;
      case 'softbreak':
        runs.push(new TextRun({ break: 1 }));
        break;
      case 'hardbreak':
        runs.push(new TextRun({ break: 1 }));
        break;
    }
  }

  return runs.length > 0 ? runs : [new TextRun('')];
}

function headingLevel(tag: string): (typeof HeadingLevel)[keyof typeof HeadingLevel] | undefined {
  const map: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
    h1: HeadingLevel.HEADING_1,
    h2: HeadingLevel.HEADING_2,
    h3: HeadingLevel.HEADING_3,
    h4: HeadingLevel.HEADING_4,
    h5: HeadingLevel.HEADING_5,
    h6: HeadingLevel.HEADING_6,
  };
  return map[tag];
}

/**
 * Process markdown-it tokens into docx Paragraph array
 */
function tokensToDocx(tokens: Token[]): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [];
  let i = 0;

  while (i < tokens.length) {
    const token = tokens[i];

    // Headings
    if (token.type === 'heading_open') {
      const inline = tokens[i + 1]; // inline token
      const runs = inline?.children ? inlineToRuns(inline.children) : [new TextRun(inline?.content || '')];
      elements.push(new Paragraph({
        children: runs,
        heading: headingLevel(token.tag),
        spacing: { before: 240, after: 120 },
      }));
      i += 3; // heading_open, inline, heading_close
      continue;
    }

    // Paragraphs
    if (token.type === 'paragraph_open') {
      const inline = tokens[i + 1];
      const runs = inline?.children ? inlineToRuns(inline.children) : [new TextRun(inline?.content || '')];
      elements.push(new Paragraph({
        children: runs,
        spacing: { after: 200 },
      }));
      i += 3; // paragraph_open, inline, paragraph_close
      continue;
    }

    // Code blocks
    if (token.type === 'fence' || token.type === 'code_block') {
      const lines = token.content.split('\n');
      for (const line of lines) {
        elements.push(new Paragraph({
          children: [new TextRun({
            text: line,
            font: 'Consolas',
            size: 20, // 10pt
          })],
          shading: { type: ShadingType.SOLID, color: 'F5F5F5' },
          spacing: { before: 0, after: 0 },
        }));
      }
      i++;
      continue;
    }

    // Bullet lists
    if (token.type === 'bullet_list_open') {
      i++;
      while (i < tokens.length && tokens[i].type !== 'bullet_list_close') {
        if (tokens[i].type === 'list_item_open') {
          i++;
          if (i < tokens.length && tokens[i].type === 'paragraph_open') {
            const inline = tokens[i + 1];
            const runs = inline?.children ? inlineToRuns(inline.children) : [new TextRun(inline?.content || '')];
            elements.push(new Paragraph({
              children: runs,
              bullet: { level: 0 },
              spacing: { after: 60 },
            }));
            i += 3; // paragraph_open, inline, paragraph_close
          }
          continue;
        }
        i++;
      }
      i++; // skip bullet_list_close
      continue;
    }

    // Ordered lists
    if (token.type === 'ordered_list_open') {
      i++;
      let num = 0;
      while (i < tokens.length && tokens[i].type !== 'ordered_list_close') {
        if (tokens[i].type === 'list_item_open') {
          num++;
          i++;
          if (i < tokens.length && tokens[i].type === 'paragraph_open') {
            const inline = tokens[i + 1];
            const runs = inline?.children ? inlineToRuns(inline.children) : [new TextRun(inline?.content || '')];
            elements.push(new Paragraph({
              children: runs,
              numbering: { reference: 'default-numbering', level: 0 },
              spacing: { after: 60 },
            }));
            i += 3;
          }
          continue;
        }
        i++;
      }
      i++; // skip ordered_list_close
      continue;
    }

    // Blockquote
    if (token.type === 'blockquote_open') {
      i++;
      while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
        if (tokens[i].type === 'paragraph_open') {
          const inline = tokens[i + 1];
          const runs = inline?.children ? inlineToRuns(inline.children) : [new TextRun(inline?.content || '')];
          elements.push(new Paragraph({
            children: runs,
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 6, color: '4472C4' }
            },
            spacing: { after: 120 },
          }));
          i += 3;
          continue;
        }
        i++;
      }
      i++; // skip blockquote_close
      continue;
    }

    // Horizontal rule
    if (token.type === 'hr') {
      elements.push(new Paragraph({
        children: [],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 1, color: 'CCCCCC' }
        },
        spacing: { before: 200, after: 200 },
      }));
      i++;
      continue;
    }

    // Table
    if (token.type === 'table_open') {
      const rows: TableRow[] = [];
      i++;
      while (i < tokens.length && tokens[i].type !== 'table_close') {
        if (tokens[i].type === 'tr_open') {
          const cells: TableCell[] = [];
          i++;
          while (i < tokens.length && tokens[i].type !== 'tr_close') {
            if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
              const isHeader = tokens[i].type === 'th_open';
              i++;
              const inline = tokens[i];
              const runs = inline?.children ? inlineToRuns(inline.children) : [new TextRun(inline?.content || '')];
              if (isHeader) {
                for (const r of runs) {
                  // Make header cells bold — not directly settable on existing runs
                }
              }
              cells.push(new TableCell({
                children: [new Paragraph({ children: runs })],
                shading: isHeader ? { type: ShadingType.SOLID, color: 'F0F0F0' } : undefined,
              }));
              i += 2; // inline + th_close/td_close
              continue;
            }
            i++;
          }
          if (cells.length > 0) {
            rows.push(new TableRow({ children: cells }));
          }
          i++; // tr_close
          continue;
        }
        // Skip thead_open/close, tbody_open/close
        i++;
      }
      if (rows.length > 0) {
        elements.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
      }
      i++; // table_close
      continue;
    }

    i++;
  }

  return elements;
}

/**
 * Generate a DOCX document from markdown content
 */
export async function generateDocx(markdownContent: string, title: string): Promise<Blob> {
  const tokens = md.parse(markdownContent, {});
  const children = tokensToDocx(tokens);

  const doc = new Document({
    title,
    sections: [{
      children: children as Paragraph[],
    }],
    numbering: {
      config: [{
        reference: 'default-numbering',
        levels: [{
          level: 0,
          format: 'decimal',
          text: '%1.',
          alignment: AlignmentType.LEFT,
        }],
      }],
    },
  });

  return await Packer.toBlob(doc);
}

/**
 * Export markdown to DOCX with save dialog
 */
export async function exportToDocx(
  markdownContent: string,
  fileName: string
): Promise<void> {
  const title = fileName.replace(/\.md$/i, '');
  const blob = await generateDocx(markdownContent, title);

  const defaultPath = fileName.replace(/\.md$/i, '.docx');

  const path = await save({
    defaultPath,
    filters: [{ name: 'Word Document', extensions: ['docx'] }],
  });

  if (path) {
    const arrayBuffer = await blob.arrayBuffer();
    const data = Array.from(new Uint8Array(arrayBuffer));
    await invoke('write_binary_file', { path, data });
  }
}
```

**Step 2: Add `write_binary_file` Tauri command**

In `src-tauri/src/commands.rs`, add:

```rust
/// Writes binary data to a file at `path`, creating parent directories if needed.
#[tauri::command]
pub fn write_binary_file(path: String, data: Vec<u8>) -> Result<(), String> {
    let file_path = std::path::PathBuf::from(&path);
    if let Some(parent) = file_path.parent() {
        std::fs::create_dir_all(parent)
            .map_err(|e| format!("Failed to create directories for '{}': {}", path, e))?;
    }
    std::fs::write(&file_path, &data)
        .map_err(|e| format!("Failed to write '{}': {}", path, e))
}
```

In `src-tauri/src/lib.rs`, register the command:

```rust
commands::write_binary_file,
```

**Step 3: Verify**

Run: `npm run check`
Run: `cd src-tauri && cargo check`

### Task 3.3: Add DOCX option to ExportMenu

**Files:**
- Modify: `src/components/ExportMenu.svelte`

**Step 1: Add import and handler**

In `ExportMenu.svelte`, add import:

```typescript
import { exportToDocx } from '$lib/docx-export';
```

Add handler function:

```typescript
async function handleExportDocx() {
  closeMenu();
  try {
    await exportToDocx(content, fileName, );
  } catch (err) {
    console.error('DOCX export failed:', err);
  }
}
```

**Step 2: Add DOCX button to dropdown**

After the "Print / Save as PDF" button, add:

```svelte
<button class="export-dropdown-item" onclick={handleExportDocx}>
  <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M4 1h8l3 3v9a2 2 0 01-2 2H4a2 2 0 01-2-2V3a2 2 0 012-2z" />
    <path d="M5 9h6" />
    <path d="M5 12h4" />
  </svg>
  <span>Export as DOCX</span>
</button>
```

**Step 3: Verify**

Run: `npm run check`
Run: `npm run tauri dev`
- Open a .md file, click Export → Export as DOCX
- Save dialog should appear, file should be created

---

## Feature 4: Interactive Diagrams

### Task 4.1: Create DiagramViewer component

**Files:**
- Create: `src/components/DiagramViewer.svelte`

**Step 1: Create the component**

Create `src/components/DiagramViewer.svelte`:

```svelte
<script lang="ts">
  import { save } from '@tauri-apps/plugin-dialog';
  import { invoke } from '@tauri-apps/api/core';

  interface Props {
    svgElement: SVGElement;
    onClose: () => void;
  }

  let { svgElement, onClose }: Props = $props();

  // Zoom/pan state
  let scale = $state(1);
  let translateX = $state(0);
  let translateY = $state(0);
  let isDragging = $state(false);
  let dragStartX = 0;
  let dragStartY = 0;
  let startTranslateX = 0;
  let startTranslateY = 0;
  let viewerEl: HTMLDivElement | undefined = $state(undefined);

  let transform = $derived(`translate(${translateX}px, ${translateY}px) scale(${scale})`);

  function zoomIn() {
    scale = Math.min(scale * 1.25, 5);
  }

  function zoomOut() {
    scale = Math.max(scale / 1.25, 0.2);
  }

  function resetZoom() {
    scale = 1;
    translateX = 0;
    translateY = 0;
  }

  function handleWheel(e: WheelEvent) {
    e.preventDefault();
    if (e.deltaY < 0) zoomIn();
    else zoomOut();
  }

  function handlePointerDown(e: PointerEvent) {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    startTranslateX = translateX;
    startTranslateY = translateY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e: PointerEvent) {
    if (!isDragging) return;
    translateX = startTranslateX + (e.clientX - dragStartX);
    translateY = startTranslateY + (e.clientY - dragStartY);
  }

  function handlePointerUp() {
    isDragging = false;
  }

  function getSvgString(): string {
    const serializer = new XMLSerializer();
    return serializer.serializeToString(svgElement);
  }

  async function exportSvg() {
    const svgString = getSvgString();
    const path = await save({
      defaultPath: 'diagram.svg',
      filters: [{ name: 'SVG', extensions: ['svg'] }],
    });
    if (path) {
      await invoke('write_file', { path, content: svgString });
    }
  }

  async function exportPng() {
    const svgString = getSvgString();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      const pixelRatio = 2; // High DPI
      canvas.width = img.width * pixelRatio;
      canvas.height = img.height * pixelRatio;
      const ctx = canvas.getContext('2d')!;
      ctx.scale(pixelRatio, pixelRatio);
      ctx.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);

      canvas.toBlob(async (blob) => {
        if (!blob) return;
        const path = await save({
          defaultPath: 'diagram.png',
          filters: [{ name: 'PNG', extensions: ['png'] }],
        });
        if (path) {
          const arrayBuffer = await blob.arrayBuffer();
          const data = Array.from(new Uint8Array(arrayBuffer));
          await invoke('write_binary_file', { path, data });
        }
      }, 'image/png');
    };
    img.src = url;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
    if (e.key === '+' || e.key === '=') zoomIn();
    if (e.key === '-') zoomOut();
    if (e.key === '0') resetZoom();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="diagram-modal-overlay" onclick={onClose}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="diagram-modal" onclick={(e) => e.stopPropagation()}>
    <div class="diagram-toolbar">
      <button class="diagram-btn" onclick={zoomOut} title="Zoom Out (-)">
        <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="14" y2="14"/><line x1="5" y1="7" x2="9" y2="7"/></svg>
      </button>
      <span class="zoom-label">{Math.round(scale * 100)}%</span>
      <button class="diagram-btn" onclick={zoomIn} title="Zoom In (+)">
        <svg viewBox="0 0 16 16" width="16" height="16" stroke="currentColor" fill="none" stroke-width="2"><circle cx="7" cy="7" r="5"/><line x1="11" y1="11" x2="14" y2="14"/><line x1="5" y1="7" x2="9" y2="7"/><line x1="7" y1="5" x2="7" y2="9"/></svg>
      </button>
      <button class="diagram-btn" onclick={resetZoom} title="Reset (0)">Reset</button>
      <div class="toolbar-spacer"></div>
      <button class="diagram-btn" onclick={exportSvg} title="Export SVG">SVG</button>
      <button class="diagram-btn" onclick={exportPng} title="Export PNG">PNG</button>
      <button class="diagram-btn close-btn" onclick={onClose} title="Close (Esc)">X</button>
    </div>
    <div
      class="diagram-canvas"
      bind:this={viewerEl}
      onwheel={handleWheel}
      onpointerdown={handlePointerDown}
      onpointermove={handlePointerMove}
      onpointerup={handlePointerUp}
    >
      <div class="diagram-content" style="transform: {transform}">
        {@html getSvgString()}
      </div>
    </div>
  </div>
</div>

<style>
  .diagram-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    z-index: 600;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .diagram-modal {
    width: 90vw;
    height: 85vh;
    background: var(--bg-primary);
    border-radius: 8px;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  }

  .diagram-toolbar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    user-select: none;
  }

  .diagram-btn {
    padding: 4px 10px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    display: inline-flex;
    align-items: center;
    gap: 4px;
    transition: background 0.15s;
  }

  .diagram-btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .close-btn {
    font-weight: bold;
  }

  .zoom-label {
    font-size: 12px;
    color: var(--text-secondary);
    min-width: 40px;
    text-align: center;
  }

  .toolbar-spacer {
    flex: 1;
  }

  .diagram-canvas {
    flex: 1;
    overflow: hidden;
    cursor: grab;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--bg-preview);
  }

  .diagram-canvas:active {
    cursor: grabbing;
  }

  .diagram-content {
    transform-origin: center center;
    transition: none;
  }

  .diagram-content :global(svg) {
    max-width: none;
    max-height: none;
  }
</style>
```

### Task 4.2: Add diagram toolbar to Preview

**Files:**
- Modify: `src/components/Preview.svelte`

**Step 1: Add diagram interaction to Preview**

In `Preview.svelte`, after the mermaid rendering loop, add hover toolbar logic. The approach: after mermaid renders SVG into shadow DOM, wrap each `.mermaid` div with a container that shows a toolbar on hover.

Add state and handlers to the `<script>` section:

```typescript
import DiagramViewer from './DiagramViewer.svelte';

let activeDiagramSvg: SVGElement | null = $state(null);
let diagramViewerOpen = $state(false);

function setupDiagramToolbars() {
  if (!previewContainer) return;
  const mermaidNodes = previewContainer.querySelectorAll('.mermaid');

  for (const node of mermaidNodes) {
    const el = node as HTMLElement;
    // Skip if already wrapped
    if (el.parentElement?.classList.contains('diagram-wrapper')) continue;

    // Create wrapper
    const wrapper = document.createElement('div');
    wrapper.className = 'diagram-wrapper';
    el.parentElement?.insertBefore(wrapper, el);
    wrapper.appendChild(el);

    // Create floating toolbar
    const toolbar = document.createElement('div');
    toolbar.className = 'diagram-hover-toolbar';
    toolbar.innerHTML = `
      <button class="dhover-btn" data-action="zoom-in" title="Zoom In">+</button>
      <button class="dhover-btn" data-action="zoom-out" title="Zoom Out">−</button>
      <button class="dhover-btn" data-action="export-svg" title="Export SVG">SVG</button>
      <button class="dhover-btn" data-action="export-png" title="Export PNG">PNG</button>
      <button class="dhover-btn" data-action="expand" title="Expand">⛶</button>
    `;
    wrapper.appendChild(toolbar);

    toolbar.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest('[data-action]');
      if (!btn) return;
      const action = btn.getAttribute('data-action');
      const shadow = el.shadowRoot;
      const svg = shadow?.querySelector('svg') as SVGElement | null;
      if (!svg) return;

      switch (action) {
        case 'expand':
          activeDiagramSvg = svg;
          diagramViewerOpen = true;
          break;
        case 'export-svg':
          quickExportSvg(svg);
          break;
        case 'export-png':
          quickExportPng(svg);
          break;
      }
    });

    // Click on diagram opens modal
    el.addEventListener('click', () => {
      const shadow = el.shadowRoot;
      const svg = shadow?.querySelector('svg') as SVGElement | null;
      if (svg) {
        activeDiagramSvg = svg;
        diagramViewerOpen = true;
      }
    });
    el.style.cursor = 'pointer';
  }
}
```

Add quick export helper functions:

```typescript
async function quickExportSvg(svg: SVGElement) {
  const { save: saveDialog } = await import('@tauri-apps/plugin-dialog');
  const { invoke: inv } = await import('@tauri-apps/api/core');
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const path = await saveDialog({
    defaultPath: 'diagram.svg',
    filters: [{ name: 'SVG', extensions: ['svg'] }],
  });
  if (path) await inv('write_file', { path, content: svgString });
}

async function quickExportPng(svg: SVGElement) {
  const { save: saveDialog } = await import('@tauri-apps/plugin-dialog');
  const { invoke: inv } = await import('@tauri-apps/api/core');
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svg);
  const blob = new Blob([svgString], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = async () => {
    const canvas = document.createElement('canvas');
    canvas.width = img.width * 2;
    canvas.height = img.height * 2;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(2, 2);
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);
    canvas.toBlob(async (pngBlob) => {
      if (!pngBlob) return;
      const path = await saveDialog({
        defaultPath: 'diagram.png',
        filters: [{ name: 'PNG', extensions: ['png'] }],
      });
      if (path) {
        const arrayBuffer = await pngBlob.arrayBuffer();
        const data = Array.from(new Uint8Array(arrayBuffer));
        await inv('write_binary_file', { path, data });
      }
    }, 'image/png');
  };
  img.src = url;
}
```

**Step 2: Call setupDiagramToolbars after mermaid renders**

At the end of the mermaid rendering loop (after the `for (const node of mermaidNodes)` block), add:

```typescript
// Setup hover toolbars after all diagrams rendered
setupDiagramToolbars();
```

**Step 3: Add DiagramViewer modal to template**

After the `</div>` closing the preview-panel div, add:

```svelte
{#if diagramViewerOpen && activeDiagramSvg}
  <DiagramViewer svgElement={activeDiagramSvg} onClose={() => { diagramViewerOpen = false; activeDiagramSvg = null; }} />
{/if}
```

**Step 4: Add CSS for hover toolbar**

Add to the `<style>` section of Preview.svelte:

```css
:global(.diagram-wrapper) {
  position: relative;
  display: inline-block;
  width: 100%;
}

:global(.diagram-hover-toolbar) {
  position: absolute;
  top: 4px;
  right: 4px;
  display: flex;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 10;
}

:global(.diagram-wrapper:hover .diagram-hover-toolbar) {
  opacity: 1;
}

:global(.dhover-btn) {
  padding: 2px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 12px;
  cursor: pointer;
  opacity: 0.9;
  transition: background 0.15s;
}

:global(.dhover-btn:hover) {
  background: var(--hover-bg);
  border-color: var(--accent);
}
```

**Step 5: Verify**

Run: `npm run check`
Run: `npm run tauri dev`
- Open a .md file with a mermaid diagram
- Hover over diagram — toolbar should appear
- Click diagram — modal should open with zoom/pan
- Export SVG/PNG should work from both toolbar and modal

---

## Feature 5: AI Helper

### Task 5.1: Add Rust HTTP proxy for AI API calls

**Files:**
- Create: `src-tauri/src/ai.rs`
- Modify: `src-tauri/src/lib.rs`
- Modify: `src-tauri/Cargo.toml`

**Step 1: Add reqwest dependency**

In `src-tauri/Cargo.toml`, add to [dependencies]:

```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio = { version = "1", features = ["full"] }
```

**Step 2: Create ai.rs**

Create `src-tauri/src/ai.rs`:

```rust
use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct AiRequest {
    pub url: String,
    pub method: String,           // "POST"
    pub headers: Vec<(String, String)>,
    pub body: String,             // JSON string
}

#[derive(Serialize)]
pub struct AiResponse {
    pub status: u16,
    pub body: String,
}

/// Proxy HTTP request to an AI API (bypasses CORS).
/// Supports POST requests with JSON body.
#[tauri::command]
pub async fn ai_request(request: AiRequest) -> Result<AiResponse, String> {
    let client = reqwest::Client::new();

    let mut req_builder = match request.method.to_uppercase().as_str() {
        "POST" => client.post(&request.url),
        "GET" => client.get(&request.url),
        _ => return Err(format!("Unsupported method: {}", request.method)),
    };

    for (key, value) in &request.headers {
        req_builder = req_builder.header(key.as_str(), value.as_str());
    }

    if !request.body.is_empty() {
        req_builder = req_builder
            .header("Content-Type", "application/json")
            .body(request.body);
    }

    let response = req_builder
        .send()
        .await
        .map_err(|e| format!("HTTP request failed: {}", e))?;

    let status = response.status().as_u16();
    let body = response
        .text()
        .await
        .map_err(|e| format!("Failed to read response: {}", e))?;

    Ok(AiResponse { status, body })
}
```

**Step 3: Register in lib.rs**

In `src-tauri/src/lib.rs`, add:

```rust
mod ai;
```

And register the command:

```rust
ai::ai_request,
```

**Step 4: Verify**

Run: `cd src-tauri && cargo check`

### Task 5.2: Create AI provider abstraction

**Files:**
- Create: `src/lib/ai-provider.ts`

**Step 1: Create the provider file**

Create `src/lib/ai-provider.ts`:

```typescript
import { invoke } from '@tauri-apps/api/core';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface AiProvider {
  name: string;
  chat(messages: AiMessage[], options?: AiOptions): Promise<string>;
}

interface AiResponse {
  status: number;
  body: string;
}

async function proxyRequest(
  url: string,
  headers: [string, string][],
  body: object
): Promise<AiResponse> {
  return await invoke<AiResponse>('ai_request', {
    request: {
      url,
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    }
  });
}

// --- Claude Provider ---
export class ClaudeProvider implements AiProvider {
  name = 'Claude';
  constructor(private apiKey: string, private model: string = 'claude-sonnet-4-5-20250929') {}

  async chat(messages: AiMessage[], options?: AiOptions): Promise<string> {
    const systemMsg = messages.find(m => m.role === 'system');
    const chatMsgs = messages.filter(m => m.role !== 'system');

    const body: any = {
      model: this.model,
      max_tokens: options?.maxTokens ?? 2048,
      messages: chatMsgs.map(m => ({ role: m.role, content: m.content })),
    };
    if (systemMsg) {
      body.system = systemMsg.content;
    }
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await proxyRequest(
      'https://api.anthropic.com/v1/messages',
      [
        ['x-api-key', this.apiKey],
        ['anthropic-version', '2023-06-01'],
      ],
      body
    );

    if (response.status !== 200) {
      const error = JSON.parse(response.body);
      throw new Error(error.error?.message || `Claude API error: ${response.status}`);
    }

    const data = JSON.parse(response.body);
    return data.content?.[0]?.text || '';
  }
}

// --- OpenAI Provider ---
export class OpenAIProvider implements AiProvider {
  name = 'OpenAI';
  constructor(private apiKey: string, private model: string = 'gpt-4o') {}

  async chat(messages: AiMessage[], options?: AiOptions): Promise<string> {
    const body: any = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      max_tokens: options?.maxTokens ?? 2048,
    };
    if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    }

    const response = await proxyRequest(
      'https://api.openai.com/v1/chat/completions',
      [
        ['Authorization', `Bearer ${this.apiKey}`],
      ],
      body
    );

    if (response.status !== 200) {
      const error = JSON.parse(response.body);
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = JSON.parse(response.body);
    return data.choices?.[0]?.message?.content || '';
  }
}

// --- Ollama Provider ---
export class OllamaProvider implements AiProvider {
  name = 'Ollama';
  constructor(private baseUrl: string = 'http://localhost:11434', private model: string = 'llama3.2') {}

  async chat(messages: AiMessage[], options?: AiOptions): Promise<string> {
    const body: any = {
      model: this.model,
      messages: messages.map(m => ({ role: m.role, content: m.content })),
      stream: false,
    };
    if (options?.temperature !== undefined) {
      body.options = { temperature: options.temperature };
    }

    const response = await proxyRequest(
      `${this.baseUrl}/api/chat`,
      [],
      body
    );

    if (response.status !== 200) {
      throw new Error(`Ollama error: ${response.status} - ${response.body}`);
    }

    const data = JSON.parse(response.body);
    return data.message?.content || '';
  }
}

// --- Provider Factory ---
export type ProviderType = 'claude' | 'openai' | 'ollama';

export interface AiConfig {
  provider: ProviderType;
  apiKey: string;
  model: string;
  ollamaUrl: string;
}

const AI_CONFIG_KEY = 'markview-ai-config';

const defaultConfig: AiConfig = {
  provider: 'claude',
  apiKey: '',
  model: '',
  ollamaUrl: 'http://localhost:11434',
};

export function loadAiConfig(): AiConfig {
  try {
    const stored = localStorage.getItem(AI_CONFIG_KEY);
    if (stored) return { ...defaultConfig, ...JSON.parse(stored) };
  } catch {}
  return { ...defaultConfig };
}

export function saveAiConfig(config: AiConfig): void {
  localStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

const defaultModels: Record<ProviderType, string> = {
  claude: 'claude-sonnet-4-5-20250929',
  openai: 'gpt-4o',
  ollama: 'llama3.2',
};

export function createProvider(config: AiConfig): AiProvider {
  const model = config.model || defaultModels[config.provider];
  switch (config.provider) {
    case 'claude':
      return new ClaudeProvider(config.apiKey, model);
    case 'openai':
      return new OpenAIProvider(config.apiKey, model);
    case 'ollama':
      return new OllamaProvider(config.ollamaUrl, model);
  }
}
```

**Step 2: Verify**

Run: `npm run check`

### Task 5.3: Create AI Panel component

**Files:**
- Create: `src/components/AIPanel.svelte`

**Step 1: Create the component**

Create `src/components/AIPanel.svelte`:

```svelte
<script lang="ts">
  import {
    loadAiConfig, saveAiConfig, createProvider,
    type AiConfig, type ProviderType, type AiMessage
  } from '$lib/ai-provider';
  import { toastManager } from '$lib/toast.svelte';

  interface Props {
    content: string;
    selectedText: string;
    onInsertText: (text: string) => void;
    onReplaceSelection: (text: string) => void;
    onClose: () => void;
  }

  let { content, selectedText, onInsertText, onReplaceSelection, onClose }: Props = $props();

  // Config
  let config = $state<AiConfig>(loadAiConfig());
  let showConfig = $state(!config.apiKey && config.provider !== 'ollama');

  // UI state
  type AiAction = 'rephrase' | 'diagram' | 'summarize' | 'custom';
  let currentAction = $state<AiAction | null>(null);
  let isLoading = $state(false);
  let result = $state('');
  let customPrompt = $state('');
  let diagramDescription = $state('');

  function updateConfig(partial: Partial<AiConfig>) {
    config = { ...config, ...partial };
    saveAiConfig(config);
  }

  async function runAction(action: AiAction) {
    if (!config.apiKey && config.provider !== 'ollama') {
      showConfig = true;
      toastManager.error('Configure AI provider first');
      return;
    }

    currentAction = action;
    isLoading = true;
    result = '';

    try {
      const provider = createProvider(config);
      let messages: AiMessage[] = [];

      switch (action) {
        case 'rephrase':
          if (!selectedText) {
            toastManager.error('Select text in editor first');
            isLoading = false;
            return;
          }
          messages = [
            { role: 'system', content: 'You are a writing assistant. Rephrase the given text to improve clarity and readability. Keep the same meaning and tone. Return ONLY the rephrased text, no explanations.' },
            { role: 'user', content: selectedText }
          ];
          break;

        case 'diagram':
          if (!diagramDescription) {
            toastManager.error('Enter a diagram description');
            isLoading = false;
            return;
          }
          messages = [
            { role: 'system', content: 'You are a Mermaid diagram expert. Generate a Mermaid diagram from the description. Return ONLY the mermaid code (without ```mermaid fences), no explanations.' },
            { role: 'user', content: diagramDescription }
          ];
          break;

        case 'summarize': {
          const textToSummarize = selectedText || content;
          if (!textToSummarize) {
            toastManager.error('No content to summarize');
            isLoading = false;
            return;
          }
          messages = [
            { role: 'system', content: 'You are a summarization assistant. Summarize the given markdown content concisely. Return ONLY the summary in markdown format, no explanations.' },
            { role: 'user', content: textToSummarize }
          ];
          break;
        }

        case 'custom':
          if (!customPrompt) {
            toastManager.error('Enter a prompt');
            isLoading = false;
            return;
          }
          messages = [
            { role: 'system', content: 'You are a helpful writing assistant. Respond in markdown format.' },
            { role: 'user', content: selectedText ? `Context:\n${selectedText}\n\nTask: ${customPrompt}` : customPrompt }
          ];
          break;
      }

      result = await provider.chat(messages);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'AI request failed';
      toastManager.error(msg);
      result = '';
    } finally {
      isLoading = false;
    }
  }

  function acceptResult() {
    if (!result) return;
    if (currentAction === 'rephrase' && selectedText) {
      onReplaceSelection(result);
    } else if (currentAction === 'diagram') {
      onInsertText('\n```mermaid\n' + result + '\n```\n');
    } else {
      onInsertText('\n' + result + '\n');
    }
    result = '';
    currentAction = null;
  }

  function discardResult() {
    result = '';
    currentAction = null;
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') onClose();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="ai-panel">
  <div class="ai-header">
    <span class="ai-title">AI Helper</span>
    <button class="ai-icon-btn" onclick={() => showConfig = !showConfig} title="Settings">
      <svg viewBox="0 0 16 16" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2"><circle cx="8" cy="8" r="2.5" /><path d="M8 1.5l.7 2.1a4.5 4.5 0 011.7 1l2.1-.7 1 1.7-1.4 1.5a4.5 4.5 0 010 1.8l1.4 1.5-1 1.7-2.1-.7a4.5 4.5 0 01-1.7 1L8 14.5l-1.7 0-.7-2.1a4.5 4.5 0 01-1.7-1l-2.1.7-1-1.7 1.4-1.5a4.5 4.5 0 010-1.8L.8 5.6l1-1.7 2.1.7a4.5 4.5 0 011.7-1L6.3 1.5z" /></svg>
    </button>
    <button class="ai-icon-btn" onclick={onClose} title="Close">X</button>
  </div>

  {#if showConfig}
    <div class="ai-config">
      <div class="config-row">
        <label class="config-label">Provider</label>
        <select class="config-input" value={config.provider} onchange={(e) => updateConfig({ provider: (e.target as HTMLSelectElement).value as ProviderType })}>
          <option value="claude">Claude (Anthropic)</option>
          <option value="openai">OpenAI</option>
          <option value="ollama">Ollama (local)</option>
        </select>
      </div>

      {#if config.provider !== 'ollama'}
        <div class="config-row">
          <label class="config-label">API Key</label>
          <input class="config-input" type="password" value={config.apiKey} onchange={(e) => updateConfig({ apiKey: (e.target as HTMLInputElement).value })} placeholder="sk-..." />
        </div>
      {/if}

      {#if config.provider === 'ollama'}
        <div class="config-row">
          <label class="config-label">Ollama URL</label>
          <input class="config-input" value={config.ollamaUrl} onchange={(e) => updateConfig({ ollamaUrl: (e.target as HTMLInputElement).value })} placeholder="http://localhost:11434" />
        </div>
      {/if}

      <div class="config-row">
        <label class="config-label">Model</label>
        <input class="config-input" value={config.model} onchange={(e) => updateConfig({ model: (e.target as HTMLInputElement).value })} placeholder="(default)" />
      </div>
    </div>
  {/if}

  <div class="ai-actions">
    <button class="ai-action-btn" onclick={() => runAction('rephrase')} disabled={isLoading}>
      Rephrase Selection
    </button>
    <button class="ai-action-btn" onclick={() => runAction('summarize')} disabled={isLoading}>
      Summarize
    </button>

    <div class="ai-input-group">
      <input class="ai-input" bind:value={diagramDescription} placeholder="Describe a diagram..." disabled={isLoading} onkeydown={(e) => { if (e.key === 'Enter') runAction('diagram'); }} />
      <button class="ai-action-btn" onclick={() => runAction('diagram')} disabled={isLoading}>Generate Diagram</button>
    </div>

    <div class="ai-input-group">
      <input class="ai-input" bind:value={customPrompt} placeholder="Custom prompt..." disabled={isLoading} onkeydown={(e) => { if (e.key === 'Enter') runAction('custom'); }} />
      <button class="ai-action-btn" onclick={() => runAction('custom')} disabled={isLoading}>Ask AI</button>
    </div>
  </div>

  {#if isLoading}
    <div class="ai-loading">Thinking...</div>
  {/if}

  {#if result}
    <div class="ai-result">
      <div class="ai-result-label">Result:</div>
      <pre class="ai-result-text">{result}</pre>
      <div class="ai-result-actions">
        <button class="ai-accept-btn" onclick={acceptResult}>Accept</button>
        <button class="ai-discard-btn" onclick={discardResult}>Discard</button>
      </div>
    </div>
  {/if}
</div>

<style>
  .ai-panel {
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow-y: auto;
    background: var(--bg-sidebar);
  }

  .ai-header {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    background: var(--bg-toolbar);
  }

  .ai-title {
    flex: 1;
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .ai-icon-btn {
    padding: 2px 6px;
    border: 1px solid var(--border);
    border-radius: 3px;
    background: none;
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
  }

  .ai-icon-btn:hover {
    background: var(--hover-bg);
    color: var(--text-primary);
  }

  .ai-config {
    padding: 8px 10px;
    border-bottom: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .config-row {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .config-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .config-input {
    padding: 4px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 12px;
    outline: none;
  }

  .config-input:focus {
    border-color: var(--accent);
  }

  .ai-actions {
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ai-action-btn {
    padding: 6px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 12px;
    cursor: pointer;
    transition: background 0.15s;
  }

  .ai-action-btn:hover:not(:disabled) {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .ai-action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .ai-input-group {
    display: flex;
    gap: 4px;
  }

  .ai-input {
    flex: 1;
    padding: 6px 8px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-editor);
    color: var(--text-primary);
    font-size: 12px;
    outline: none;
  }

  .ai-input:focus {
    border-color: var(--accent);
  }

  .ai-loading {
    padding: 12px;
    text-align: center;
    color: var(--accent);
    font-size: 13px;
    animation: pulse 1.5s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .ai-result {
    padding: 10px;
    border-top: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ai-result-label {
    font-size: 11px;
    color: var(--text-muted);
    text-transform: uppercase;
  }

  .ai-result-text {
    padding: 8px;
    background: var(--bg-editor);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-primary);
    white-space: pre-wrap;
    word-break: break-word;
    max-height: 300px;
    overflow-y: auto;
    font-family: inherit;
    margin: 0;
  }

  .ai-result-actions {
    display: flex;
    gap: 8px;
  }

  .ai-accept-btn {
    padding: 6px 16px;
    border: 1px solid var(--accent);
    border-radius: 4px;
    background: var(--accent);
    color: white;
    font-size: 12px;
    cursor: pointer;
  }

  .ai-accept-btn:hover {
    opacity: 0.9;
  }

  .ai-discard-btn {
    padding: 6px 16px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-secondary);
    font-size: 12px;
    cursor: pointer;
  }

  .ai-discard-btn:hover {
    background: var(--hover-bg);
  }
</style>
```

**Step 2: Verify**

Run: `npm run check`

### Task 5.4: Wire AI Panel into main page

**Files:**
- Modify: `src/routes/+page.svelte`

**Step 1: Add AI sidebar tab and panel**

In `+page.svelte`:

1. Add import:
```typescript
import AIPanel from '../components/AIPanel.svelte';
```

2. Extend `SidebarMode` type:
```typescript
type SidebarMode = 'files' | 'search' | 'git' | 'toc' | 'ai';
```

3. Add selectedText state:
```typescript
let selectedText = $state('');
```

4. Add AI handlers:
```typescript
function handleAiInsertText(text: string) {
  insertCommand = { type: '__raw:' + text, timestamp: Date.now() };
}

function handleAiReplaceSelection(text: string) {
  // For replace, we need to insert the replacement at current selection
  insertCommand = { type: '__raw:' + text, timestamp: Date.now() };
}
```

5. Add selection tracking — modify Editor's `onContentChange` or add a new prop. Simplest approach: add an `onSelectionChange` prop to Editor. For now, use a simpler approach — read selection from the editor when AI panel is active.

Add to Editor.svelte Props interface:
```typescript
onSelectionChange?: (text: string) => void;
```

Add to Editor.svelte's EditorView.updateListener:
```typescript
if (update.selectionSet) {
  const { from, to } = update.state.selection.main;
  const text = from !== to ? update.state.sliceDoc(from, to) : '';
  onSelectionChange?.(text);
}
```

In `+page.svelte`, pass it to Editor:
```typescript
onSelectionChange={(text) => { selectedText = text; }}
```

6. Add AI tab button to sidebar (after ToC button):
```svelte
<button
  class="sidebar-tab"
  class:active={sidebarMode === 'ai'}
  onclick={() => sidebarMode = 'ai'}
  title="AI Helper"
><svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 1v2M4.5 2.5l1 1.7M11.5 2.5l-1 1.7" /><circle cx="8" cy="9" r="5" /><circle cx="6.5" cy="8" r="1" fill="currentColor" /><circle cx="9.5" cy="8" r="1" fill="currentColor" /><path d="M6 11c.5.6 1.2 1 2 1s1.5-.4 2-1" /></svg></button>
```

7. Add AI panel to sidebar content:
```svelte
{:else if sidebarMode === 'ai'}
  <AIPanel
    {content}
    {selectedText}
    onInsertText={handleAiInsertText}
    onReplaceSelection={handleAiReplaceSelection}
    onClose={() => sidebarMode = 'files'}
  />
```

8. Add keyboard shortcut (Ctrl+Shift+A):
```typescript
// Ctrl+Shift+A — AI panel
if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'A') {
  e.preventDefault();
  sidebarMode = sidebarMode === 'ai' ? 'files' : 'ai';
}
```

9. Add command palette entry:
```typescript
case 'tools.ai': sidebarMode = sidebarMode === 'ai' ? 'files' : 'ai'; break;
```

**Step 2: Verify**

Run: `npm run check`
Run: `npm run tauri dev`
- Click AI tab in sidebar — panel should appear
- Configure API key
- Select text, click "Rephrase Selection" — should return rephrased text
- Enter diagram description, click "Generate Diagram" — should return mermaid code
- Accept button should insert result into editor

---

## Build & Verification

### Task 6.1: Full build check

**Step 1: Frontend check**

Run: `npm run check`

**Step 2: Rust check**

Run: `cd src-tauri && cargo check`

**Step 3: Dev mode test**

Run: `npm run tauri dev`

Test checklist:
- [ ] Folding: fold gutters visible, fold/unfold headings and code blocks
- [ ] Autocomplete: `/` triggers suggestions, mermaid blocks get context-aware completions
- [ ] DOCX export: Export menu shows DOCX option, saves .docx file
- [ ] Diagrams: hover toolbar appears, click opens modal, zoom/pan works, SVG/PNG export
- [ ] AI: panel opens, config saves, rephrase/diagram/summarize/custom all work

### Task 6.2: Production build

**Step 1: Build**

Run: `npm run tauri build`

Expected: Produces `src-tauri/target/release/markview.exe`

---

## Summary of new files

| File | Feature |
|------|---------|
| `src/lib/markdown-fold.ts` | Folding |
| `src/lib/autocomplete.ts` | Autocomplete |
| `src/lib/docx-export.ts` | DOCX Export |
| `src/lib/ai-provider.ts` | AI Helper |
| `src/components/DiagramViewer.svelte` | Diagrams |
| `src/components/AIPanel.svelte` | AI Helper |
| `src-tauri/src/ai.rs` | AI Helper (Rust proxy) |

## Summary of modified files

| File | Changes |
|------|---------|
| `src/components/Editor.svelte` | + folding, autocomplete imports & extensions, + onSelectionChange prop |
| `src/components/Preview.svelte` | + diagram toolbar, + DiagramViewer modal |
| `src/components/ExportMenu.svelte` | + DOCX export option |
| `src/routes/+page.svelte` | + AI sidebar tab, + AI panel, + keyboard shortcut, + selectedText state |
| `src-tauri/src/lib.rs` | + ai module, + ai_request command, + write_binary_file command |
| `src-tauri/src/commands.rs` | + write_binary_file command |
| `src-tauri/Cargo.toml` | + reqwest, tokio dependencies |
| `package.json` | + docx, file-saver, @codemirror/autocomplete |

## New npm dependencies

```
npm install docx file-saver @codemirror/autocomplete
npm install -D @types/file-saver
```

## New Cargo dependencies

```toml
reqwest = { version = "0.12", features = ["json", "stream"] }
tokio = { version = "1", features = ["full"] }
```
