import { autocompletion, type CompletionContext, type CompletionResult } from '@codemirror/autocomplete';
import type { EditorView } from '@codemirror/view';

interface SnippetItem {
  label: string;
  detail: string;
  template: string;
  cursorOffset?: number;
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
  const triggerMatch = context.matchBefore(/\/\w*/);
  if (!triggerMatch && !context.explicit) return null;

  const from = triggerMatch ? triggerMatch.from : context.pos;

  return {
    from,
    options: markdownSnippets.map(s => ({
      label: s.label,
      detail: s.detail,
      apply: (view: EditorView, _completion: any, from: number, to: number) => {
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
  for (let i = state.doc.lineAt(pos).number - 1; i >= 1; i--) {
    const lineText = state.doc.line(i).text.trim();
    if (lineText.startsWith('```') && !lineText.startsWith('```mermaid')) {
      return null;
    }
    if (lineText === '```mermaid') {
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

function mermaidCompletions(context: CompletionContext): CompletionResult | null {
  if (!detectMermaidType(context.state, context.pos)) return null;

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
      type: 'keyword' as const
    })),
    filter: true
  };
}

export function markdownAutocompletion() {
  return autocompletion({
    override: [markdownCompletions, mermaidCompletions],
    defaultKeymap: true,
  });
}
