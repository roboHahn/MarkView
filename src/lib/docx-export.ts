import {
  Document, Packer, Paragraph, TextRun, HeadingLevel,
  AlignmentType, BorderStyle, Table, TableRow, TableCell,
  WidthType, ShadingType, LevelFormat
} from 'docx';
import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import MarkdownIt from 'markdown-it';
import type Token from 'markdown-it/lib/token.mjs';

const md = new MarkdownIt();

// ── Heading level map ────────────────────────────────────────────────
const headingLevelMap: Record<string, (typeof HeadingLevel)[keyof typeof HeadingLevel]> = {
  h1: HeadingLevel.HEADING_1,
  h2: HeadingLevel.HEADING_2,
  h3: HeadingLevel.HEADING_3,
  h4: HeadingLevel.HEADING_4,
  h5: HeadingLevel.HEADING_5,
  h6: HeadingLevel.HEADING_6,
};


// ── Inline token → TextRun[] ─────────────────────────────────────────
interface RunStyle {
  bold?: boolean;
  italics?: boolean;
  code?: boolean;
}

function inlineToRuns(children: Token[] | undefined, parentStyle: RunStyle = {}): TextRun[] {
  if (!children || children.length === 0) return [];

  const runs: TextRun[] = [];

  for (let i = 0; i < children.length; i++) {
    const tok = children[i];

    if (tok.type === 'text') {
      runs.push(new TextRun({
        text: tok.content,
        bold: parentStyle.bold,
        italics: parentStyle.italics,
        font: parentStyle.code ? 'Courier New' : undefined,
        shading: parentStyle.code ? { type: ShadingType.CLEAR, fill: 'E8E8E8' } : undefined,
        size: parentStyle.code ? 20 : undefined,
      }));
    } else if (tok.type === 'code_inline') {
      runs.push(new TextRun({
        text: tok.content,
        bold: parentStyle.bold,
        italics: parentStyle.italics,
        font: 'Courier New',
        shading: { type: ShadingType.CLEAR, fill: 'E8E8E8' },
        size: 20,
      }));
    } else if (tok.type === 'softbreak' || tok.type === 'hardbreak') {
      runs.push(new TextRun({ break: 1 }));
    } else if (tok.type === 'strong_open') {
      // Collect children until strong_close
      const innerTokens: Token[] = [];
      i++;
      while (i < children.length && children[i].type !== 'strong_close') {
        innerTokens.push(children[i]);
        i++;
      }
      runs.push(...inlineToRuns(innerTokens, { ...parentStyle, bold: true }));
    } else if (tok.type === 'em_open') {
      const innerTokens: Token[] = [];
      i++;
      while (i < children.length && children[i].type !== 'em_close') {
        innerTokens.push(children[i]);
        i++;
      }
      runs.push(...inlineToRuns(innerTokens, { ...parentStyle, italics: true }));
    } else if (tok.type === 's_open') {
      const innerTokens: Token[] = [];
      i++;
      while (i < children.length && children[i].type !== 's_close') {
        innerTokens.push(children[i]);
        i++;
      }
      runs.push(...inlineToRuns(innerTokens, parentStyle));
    } else if (tok.type === 'html_inline') {
      // Skip HTML inline tokens
    } else if (tok.type === 'image') {
      // Render alt text as placeholder
      const alt = tok.content || tok.children?.map(c => c.content).join('') || '[image]';
      runs.push(new TextRun({
        text: `[${alt}]`,
        italics: true,
        color: '888888',
      }));
    } else if (tok.type === 'link_open') {
      const innerTokens: Token[] = [];
      i++;
      while (i < children.length && children[i].type !== 'link_close') {
        innerTokens.push(children[i]);
        i++;
      }
      runs.push(...inlineToRuns(innerTokens, { ...parentStyle }));
    }
  }

  return runs;
}

// ── Block tokens → docx paragraphs ──────────────────────────────────
type DocxChild = Paragraph | Table;

function tokensToDocx(tokens: Token[]): DocxChild[] {
  const elements: DocxChild[] = [];
  let i = 0;

  while (i < tokens.length) {
    const tok = tokens[i];

    // ── Headings ──────────────────────────────────────────────────
    if (tok.type === 'heading_open') {
      const tag = tok.tag as string; // h1..h6
      const level = headingLevelMap[tag];
      i++; // move to inline
      const inlineTok = tokens[i];
      const runs = inlineTok?.children ? inlineToRuns(inlineTok.children) : [new TextRun(inlineTok?.content ?? '')];
      elements.push(new Paragraph({
        heading: level,
        children: runs,
        spacing: { before: 240, after: 120 },
      }));
      i++; // skip heading_close
      i++;
      continue;
    }

    // ── Paragraphs ────────────────────────────────────────────────
    if (tok.type === 'paragraph_open') {
      i++; // move to inline
      const inlineTok = tokens[i];
      const runs = inlineTok?.children ? inlineToRuns(inlineTok.children) : [new TextRun(inlineTok?.content ?? '')];
      elements.push(new Paragraph({
        children: runs,
        spacing: { after: 200 },
      }));
      i++; // skip paragraph_close
      i++;
      continue;
    }

    // ── Bullet lists ──────────────────────────────────────────────
    if (tok.type === 'bullet_list_open') {
      i++;
      i = parseBulletListItems(tokens, i, elements, 0);
      // skip bullet_list_close
      i++;
      continue;
    }

    // ── Ordered lists ─────────────────────────────────────────────
    if (tok.type === 'ordered_list_open') {
      i++;
      i = parseOrderedListItems(tokens, i, elements, 0);
      // skip ordered_list_close
      i++;
      continue;
    }

    // ── Code blocks (fenced) ──────────────────────────────────────
    if (tok.type === 'fence' || tok.type === 'code_block') {
      const lines = tok.content.replace(/\n$/, '').split('\n');
      for (let li = 0; li < lines.length; li++) {
        elements.push(new Paragraph({
          children: [
            new TextRun({
              text: lines[li] || ' ',
              font: 'Courier New',
              size: 20,
            }),
          ],
          shading: { type: ShadingType.CLEAR, fill: 'F0F0F0' },
          spacing: { after: 0, before: 0, line: 276 },
        }));
      }
      // Add spacing after code block
      elements.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
      i++;
      continue;
    }

    // ── Blockquotes ───────────────────────────────────────────────
    if (tok.type === 'blockquote_open') {
      i++;
      const quoteElements: DocxChild[] = [];
      while (i < tokens.length && tokens[i].type !== 'blockquote_close') {
        if (tokens[i].type === 'paragraph_open') {
          i++;
          const inlineTok = tokens[i];
          const runs = inlineTok?.children ? inlineToRuns(inlineTok.children) : [new TextRun(inlineTok?.content ?? '')];
          quoteElements.push(new Paragraph({
            children: runs,
            indent: { left: 720 },
            border: {
              left: { style: BorderStyle.SINGLE, size: 6, color: '4472C4', space: 10 },
            },
            spacing: { after: 100 },
          }));
          i++; // skip paragraph_close
        }
        i++;
      }
      elements.push(...quoteElements);
      i++; // skip blockquote_close
      continue;
    }

    // ── Tables ────────────────────────────────────────────────────
    if (tok.type === 'table_open') {
      i++;
      const rows: TableRow[] = [];
      let isHeader = false;

      while (i < tokens.length && tokens[i].type !== 'table_close') {
        if (tokens[i].type === 'thead_open') {
          isHeader = true;
          i++;
          continue;
        }
        if (tokens[i].type === 'thead_close') {
          isHeader = false;
          i++;
          continue;
        }
        if (tokens[i].type === 'tbody_open' || tokens[i].type === 'tbody_close') {
          i++;
          continue;
        }

        if (tokens[i].type === 'tr_open') {
          i++;
          const cells: TableCell[] = [];

          while (i < tokens.length && tokens[i].type !== 'tr_close') {
            if (tokens[i].type === 'th_open' || tokens[i].type === 'td_open') {
              i++;
              const cellInline = tokens[i];
              const runs = cellInline?.children ? inlineToRuns(cellInline.children) : [new TextRun(cellInline?.content ?? '')];
              cells.push(new TableCell({
                children: [new Paragraph({
                  children: runs,
                  spacing: { after: 0 },
                })],
                shading: isHeader ? { type: ShadingType.CLEAR, fill: 'D9E2F3' } : undefined,
              }));
              i++; // skip th_close / td_close
            }
            i++;
          }

          rows.push(new TableRow({
            children: cells,
            tableHeader: isHeader,
          }));
          i++; // skip tr_close
          continue;
        }
        i++;
      }

      if (rows.length > 0) {
        elements.push(new Table({
          rows,
          width: { size: 100, type: WidthType.PERCENTAGE },
        }));
        // Add spacing after table
        elements.push(new Paragraph({ spacing: { after: 200 }, children: [] }));
      }
      i++; // skip table_close
      continue;
    }

    // ── Horizontal rule ───────────────────────────────────────────
    if (tok.type === 'hr') {
      elements.push(new Paragraph({
        children: [],
        border: {
          bottom: { style: BorderStyle.SINGLE, size: 6, color: 'AAAAAA', space: 1 },
        },
        spacing: { before: 200, after: 200 },
      }));
      i++;
      continue;
    }

    // ── HTML block (skip) ─────────────────────────────────────────
    if (tok.type === 'html_block') {
      i++;
      continue;
    }

    // Fallback: skip unknown tokens
    i++;
  }

  return elements;
}

// ── Parse bullet list items ──────────────────────────────────────────
function parseBulletListItems(
  tokens: Token[],
  startIdx: number,
  elements: DocxChild[],
  level: number
): number {
  let i = startIdx;

  while (i < tokens.length && tokens[i].type !== 'bullet_list_close') {
    if (tokens[i].type === 'list_item_open') {
      i++;
      while (i < tokens.length && tokens[i].type !== 'list_item_close') {
        if (tokens[i].type === 'paragraph_open') {
          i++;
          const inlineTok = tokens[i];
          const runs = inlineTok?.children ? inlineToRuns(inlineTok.children) : [new TextRun(inlineTok?.content ?? '')];
          elements.push(new Paragraph({
            children: runs,
            bullet: { level },
            spacing: { after: 40 },
          }));
          i++; // skip paragraph_close
          i++;
          continue;
        }
        if (tokens[i].type === 'bullet_list_open') {
          i++;
          i = parseBulletListItems(tokens, i, elements, level + 1);
          i++; // skip bullet_list_close
          continue;
        }
        if (tokens[i].type === 'ordered_list_open') {
          i++;
          i = parseOrderedListItems(tokens, i, elements, level + 1);
          i++; // skip ordered_list_close
          continue;
        }
        i++;
      }
      i++; // skip list_item_close
      continue;
    }
    i++;
  }
  return i;
}

// ── Parse ordered list items ─────────────────────────────────────────
function parseOrderedListItems(
  tokens: Token[],
  startIdx: number,
  elements: DocxChild[],
  level: number
): number {
  let i = startIdx;

  while (i < tokens.length && tokens[i].type !== 'ordered_list_close') {
    if (tokens[i].type === 'list_item_open') {
      i++;
      while (i < tokens.length && tokens[i].type !== 'list_item_close') {
        if (tokens[i].type === 'paragraph_open') {
          i++;
          const inlineTok = tokens[i];
          const runs = inlineTok?.children ? inlineToRuns(inlineTok.children) : [new TextRun(inlineTok?.content ?? '')];
          elements.push(new Paragraph({
            children: runs,
            numbering: { reference: 'ordered-list', level },
            spacing: { after: 40 },
          }));
          i++; // skip paragraph_close
          i++;
          continue;
        }
        if (tokens[i].type === 'bullet_list_open') {
          i++;
          i = parseBulletListItems(tokens, i, elements, level + 1);
          i++; // skip bullet_list_close
          continue;
        }
        if (tokens[i].type === 'ordered_list_open') {
          i++;
          i = parseOrderedListItems(tokens, i, elements, level + 1);
          i++; // skip ordered_list_close
          continue;
        }
        i++;
      }
      i++; // skip list_item_close
      continue;
    }
    i++;
  }
  return i;
}

// ── Generate DOCX Document ───────────────────────────────────────────
function generateDocx(markdown: string, title: string): Document {
  const tokens = md.parse(markdown, {});
  const children = tokensToDocx(tokens);

  return new Document({
    title,
    numbering: {
      config: [
        {
          reference: 'ordered-list',
          levels: [
            { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START },
            { level: 1, format: LevelFormat.LOWER_LETTER, text: '%2)', alignment: AlignmentType.START },
            { level: 2, format: LevelFormat.LOWER_ROMAN, text: '%3.', alignment: AlignmentType.START },
            { level: 3, format: LevelFormat.DECIMAL, text: '%4.', alignment: AlignmentType.START },
            { level: 4, format: LevelFormat.LOWER_LETTER, text: '%5)', alignment: AlignmentType.START },
          ],
        },
      ],
    },
    sections: [
      {
        children,
      },
    ],
  });
}

// ── Export to DOCX (public API) ──────────────────────────────────────
export async function exportToDocx(
  markdownContent: string,
  fileName: string
): Promise<void> {
  const title = fileName.replace(/\.md$/i, '');
  const doc = generateDocx(markdownContent, title);

  const blob = await Packer.toBlob(doc);
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
