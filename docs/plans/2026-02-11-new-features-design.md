# MarkView — Nové funkcie (dizajn)

Dátum: 2026-02-11

## 1. Interaktívne diagramy (zoom, export PNG/SVG)

### Preview toolbar
- Pri hover nad mermaid diagramom sa zobrazí floating toolbar (vpravo hore)
- Tlačidlá: Zoom +, Zoom -, Export PNG, Export SVG, Expand (modal)

### Modal view
- Klik na diagram alebo Expand otvorí fullscreen modal
- Pan & zoom cez CSS transform + mouse drag/wheel
- Rovnaké export tlačidlá (PNG/SVG)
- Escape / klik mimo = zavrieť

### Implementácia
- Nový komponent: `src/components/DiagramViewer.svelte`
- PNG export: SVG → canvas → `toBlob()`
- SVG export: priamy download SVG elementu
- Uloženie cez Tauri dialog

---

## 2. Export do DOCX

### Prístup
- NPM knižnica `docx` — generovanie .docx vo frontende

### Pipeline
Markdown → markdown-it tokens → docx Document:
- Headings (H1-H6) so správnymi štýlmi
- Paragrafy s bold/italic/code inline
- Bullet a numbered listy
- Code bloky (monospace, šedé pozadie)
- Tabuľky
- Obrázky (lokálne embednuté, URL stiahnuté)

### UI
- Tretí option v `ExportMenu.svelte`: "Export as DOCX"
- Tauri dialog na save

### Nové súbory
- `src/lib/docx-export.ts` — konverzná logika

---

## 3. Skladanie/rozbaľovanie sekcií (Folding)

### Funkcionalita
- Fold na heading úrovniach — `# Section` zbalí všetko po ďalší heading rovnakej/vyššej úrovne
- Fold na code blocks (``` ... ```)
- Gutter ikonky (▸/▾)
- Klávesové skratky: Ctrl+Shift+[ fold, Ctrl+Shift+] unfold

### Implementácia
- Rozšírenie extensions v `Editor.svelte`
- `@codemirror/language` — `foldGutter`, `foldKeymap`
- Custom `foldService` pre markdown heading ranges

---

## 4. Autocomplete

### Markdown syntax
- Trigger: `/` alebo začiatok riadku
- Ponuky: heading, bold, italic, link, image, code block, tabuľka, hr, task list, footnote
- Snippety s kurzorom na správnej pozícii

### Mermaid autocomplete
- Trigger: vnútri ```mermaid blokov
- Typy diagramov: graph TD, sequenceDiagram, classDiagram...
- Context-aware kľúčové slová podľa typu diagramu

### Implementácia
- `@codemirror/autocomplete` extension
- Nový súbor: `src/lib/autocomplete.ts`

---

## 5. AI Pomocník

### Provider abstrakcia
- Interface `AIProvider` s `chat(messages, options): AsyncGenerator<string>` (streaming)
- Implementácie: `ClaudeProvider`, `OpenAIProvider`, `OllamaProvider`
- Konfigurácia v nastaveniach: provider, API kľúč, model, Ollama URL
- API volania cez Tauri HTTP client (Rust backend, obíde CORS)

### Funkcie
1. **Preformulovanie textu** — označ text → AI prepíše → diff → prijať/odmietnuť
2. **Generovanie diagramu** — popis → AI vygeneruje mermaid kód → vloží do editora
3. **Zhrnutie sekcie** — kurzor v sekcii → AI zhrnie → vloží nad/pod sekciu

### UI
- `AIPanel.svelte` — sidebar panel
- Context menu v editore: "AI: Preformuluj", "AI: Zhrň"
- Toolbar tlačidlo pre AI panel
- Streaming odpovede s typing indikátorom

### Nové súbory
- `src/lib/ai-provider.ts` — provider abstrakcia + implementácie
- `src/components/AIPanel.svelte` — UI panel
- `src-tauri/src/ai.rs` — Rust HTTP proxy pre API volania
