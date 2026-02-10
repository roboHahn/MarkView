<script lang="ts">
  interface Props {
    onInsert: (markdown: string) => void;
    onClose: () => void;
  }

  let { onInsert, onClose }: Props = $props();

  let cols = $state(3);
  let rows = $state(3);
  let cells: string[][] = $state(createGrid(3, 3));

  function createGrid(numCols: number, numRows: number): string[][] {
    const grid: string[][] = [];
    for (let r = 0; r < numRows; r++) {
      const row: string[] = [];
      for (let c = 0; c < numCols; c++) {
        row.push(r === 0 ? `Header ${c + 1}` : '');
      }
      grid.push(row);
    }
    return grid;
  }

  function addRow() {
    const newRow: string[] = [];
    for (let c = 0; c < cols; c++) {
      newRow.push('');
    }
    cells.push(newRow);
    rows = cells.length;
  }

  function removeRow() {
    if (rows <= 1) return;
    cells.pop();
    rows = cells.length;
  }

  function addColumn() {
    for (let r = 0; r < rows; r++) {
      cells[r].push(r === 0 ? `Header ${cols + 1}` : '');
    }
    cols = cells[0].length;
  }

  function removeColumn() {
    if (cols <= 1) return;
    for (let r = 0; r < rows; r++) {
      cells[r].pop();
    }
    cols = cells[0].length;
  }

  function handleCellInput(row: number, col: number, event: Event) {
    const target = event.target as HTMLInputElement;
    cells[row][col] = target.value;
  }

  let markdownPreview = $derived(generateMarkdown());

  function generateMarkdown(): string {
    if (rows === 0 || cols === 0) return '';

    const padCell = (text: string, width: number) => {
      const content = text || ' ';
      return ' ' + content.padEnd(width) + ' ';
    };

    // Calculate column widths (minimum 3 for the separator dashes)
    const colWidths: number[] = [];
    for (let c = 0; c < cols; c++) {
      let maxLen = 3;
      for (let r = 0; r < rows; r++) {
        const len = (cells[r]?.[c] || '').length;
        if (len > maxLen) maxLen = len;
      }
      colWidths.push(maxLen);
    }

    const lines: string[] = [];

    // Header row
    const headerCells = [];
    for (let c = 0; c < cols; c++) {
      headerCells.push(padCell(cells[0]?.[c] || '', colWidths[c]));
    }
    lines.push('|' + headerCells.join('|') + '|');

    // Separator row
    const sepCells = [];
    for (let c = 0; c < cols; c++) {
      sepCells.push(' ' + '-'.repeat(colWidths[c]) + ' ');
    }
    lines.push('|' + sepCells.join('|') + '|');

    // Data rows
    for (let r = 1; r < rows; r++) {
      const rowCells = [];
      for (let c = 0; c < cols; c++) {
        rowCells.push(padCell(cells[r]?.[c] || '', colWidths[c]));
      }
      lines.push('|' + rowCells.join('|') + '|');
    }

    return lines.join('\n');
  }

  function handleInsert() {
    onInsert(markdownPreview);
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      onClose();
    }
  }

  function handleOverlayClick() {
    onClose();
  }

  function handleModalClick(event: MouseEvent) {
    event.stopPropagation();
  }
</script>

<svelte:window onkeydown={handleKeydown} />

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div class="overlay" onclick={handleOverlayClick}>
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div class="modal" onclick={handleModalClick}>
    <div class="topbar">
      <span class="topbar-title">Table Editor</span>
      <div class="topbar-actions">
        <button class="btn btn-accent" onclick={handleInsert}>Insert</button>
        <button class="btn" onclick={onClose}>Close</button>
      </div>
    </div>

    <div class="editor-body">
      <!-- Table controls -->
      <div class="controls">
        <div class="control-group">
          <button class="btn btn-sm" onclick={addRow}>+ Row</button>
          <button class="btn btn-sm" onclick={removeRow} disabled={rows <= 1}>- Row</button>
        </div>
        <div class="control-group">
          <button class="btn btn-sm" onclick={addColumn}>+ Column</button>
          <button class="btn btn-sm" onclick={removeColumn} disabled={cols <= 1}>- Column</button>
        </div>
        <span class="dimensions">{cols} x {rows}</span>
      </div>

      <!-- Editable grid -->
      <div class="grid-container">
        <table class="edit-table">
          <tbody>
            {#each cells as row, r}
              <tr class:header-row={r === 0}>
                {#each row as cell, c}
                  <td>
                    <input
                      class="cell-input"
                      class:header-cell={r === 0}
                      type="text"
                      value={cell}
                      oninput={(e) => handleCellInput(r, c, e)}
                      placeholder={r === 0 ? 'Header' : 'Cell'}
                    />
                  </td>
                {/each}
              </tr>
            {/each}
          </tbody>
        </table>
      </div>

      <!-- Markdown preview -->
      <div class="preview-section">
        <div class="preview-label">Markdown Preview</div>
        <pre class="preview-code">{markdownPreview}</pre>
      </div>
    </div>
  </div>
</div>

<style>
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.5);
    z-index: 500;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal {
    width: 90vw;
    max-width: 720px;
    max-height: 85vh;
    background: var(--bg-primary);
    border-radius: 8px;
    border: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  }

  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 44px;
    min-height: 44px;
    padding: 0 12px;
    background: var(--bg-toolbar);
    border-bottom: 1px solid var(--border);
    user-select: none;
    -webkit-user-select: none;
  }

  .topbar-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .topbar-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .btn {
    padding: 4px 12px;
    border: 1px solid var(--border);
    border-radius: 4px;
    background: var(--bg-primary);
    color: var(--text-primary);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.15s, border-color 0.15s;
  }

  .btn:hover {
    background: var(--hover-bg);
    border-color: var(--accent);
  }

  .btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .btn:disabled:hover {
    background: var(--bg-primary);
    border-color: var(--border);
  }

  .btn-accent {
    background: var(--accent);
    color: var(--bg-primary);
    border-color: var(--accent);
    font-weight: 600;
  }

  .btn-accent:hover {
    opacity: 0.9;
    background: var(--accent);
    border-color: var(--accent);
  }

  .btn-sm {
    padding: 3px 10px;
    font-size: 12px;
  }

  .editor-body {
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
    min-height: 0;
  }

  .controls {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-wrap: wrap;
  }

  .control-group {
    display: flex;
    gap: 4px;
  }

  .dimensions {
    font-size: 12px;
    color: var(--text-secondary);
    margin-left: auto;
  }

  .grid-container {
    overflow: auto;
    border: 1px solid var(--border);
    border-radius: 4px;
  }

  .edit-table {
    border-collapse: collapse;
    width: 100%;
    min-width: max-content;
  }

  .edit-table td {
    padding: 0;
    border: 1px solid var(--border);
  }

  .header-row {
    background: var(--hover-bg);
  }

  .cell-input {
    width: 100%;
    min-width: 80px;
    padding: 6px 8px;
    border: none;
    background: transparent;
    color: var(--text-primary);
    font-size: 13px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
  }

  .cell-input:focus {
    background: var(--bg-preview);
    box-shadow: inset 0 0 0 1.5px var(--accent);
  }

  .cell-input.header-cell {
    font-weight: 600;
  }

  .cell-input::placeholder {
    color: var(--text-secondary);
    opacity: 0.5;
  }

  .preview-section {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .preview-label {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .preview-code {
    margin: 0;
    padding: 12px;
    background: var(--bg-preview);
    border: 1px solid var(--border);
    border-radius: 4px;
    font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
    font-size: 12px;
    line-height: 1.5;
    color: var(--text-primary);
    white-space: pre;
    overflow-x: auto;
  }

  .editor-body::-webkit-scrollbar {
    width: 6px;
  }

  .editor-body::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  .editor-body::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }

  .grid-container::-webkit-scrollbar {
    width: 6px;
    height: 6px;
  }

  .grid-container::-webkit-scrollbar-track {
    background: var(--scrollbar-track);
  }

  .grid-container::-webkit-scrollbar-thumb {
    background: var(--scrollbar-thumb);
    border-radius: 3px;
  }
</style>
