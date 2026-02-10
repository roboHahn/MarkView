import { save } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import { renderMarkdown } from './markdown';

/**
 * Generates a complete, self-contained HTML document from markdown content.
 */
export function generateHtmlDocument(
  markdownContent: string,
  title: string,
  theme: 'dark' | 'light'
): string {
  const renderedHtml = renderMarkdown(markdownContent);

  const isDark = theme === 'dark';

  // Self-contained color values matching the app's theme
  const colors = isDark
    ? {
        bg: '#1e1e2e',
        bgCode: '#181825',
        text: '#cdd6f4',
        textSecondary: '#bac2de',
        textMuted: '#6c7086',
        accent: '#89b4fa',
        border: '#313244',
      }
    : {
        bg: '#ffffff',
        bgCode: '#fafafa',
        text: '#1e1e2e',
        textSecondary: '#444444',
        textMuted: '#6c7086',
        accent: '#1e66f5',
        border: '#e0e0e0',
      };

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    *, *::before, *::after {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 24px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: ${colors.text};
      background-color: ${colors.bg};
    }

    h1, h2, h3, h4, h5, h6 {
      color: ${colors.text};
      margin-top: 1.4em;
      margin-bottom: 0.6em;
      line-height: 1.3;
      font-weight: 600;
    }

    h1 {
      font-size: 2em;
      padding-bottom: 0.3em;
      border-bottom: 1px solid ${colors.border};
    }

    h2 {
      font-size: 1.5em;
      padding-bottom: 0.25em;
      border-bottom: 1px solid ${colors.border};
    }

    h3 { font-size: 1.25em; }
    h4 { font-size: 1.1em; }
    h5 { font-size: 1em; }

    h6 {
      font-size: 0.9em;
      color: ${colors.textMuted};
    }

    h1:first-child, h2:first-child, h3:first-child,
    h4:first-child, h5:first-child, h6:first-child {
      margin-top: 0;
    }

    p {
      margin-bottom: 1em;
      line-height: 1.7;
    }

    ul, ol {
      margin-bottom: 1em;
      padding-left: 2em;
    }

    ul { list-style-type: disc; }
    ol { list-style-type: decimal; }

    li {
      margin-bottom: 0.25em;
      line-height: 1.6;
    }

    li > ul, li > ol {
      margin-bottom: 0;
      margin-top: 0.25em;
    }

    code {
      font-family: 'Cascadia Code', 'Fira Code', 'JetBrains Mono', 'Consolas', monospace;
      font-size: 0.9em;
      background: ${colors.bgCode};
      padding: 0.15em 0.4em;
      border-radius: 4px;
      color: ${colors.textSecondary};
    }

    pre {
      margin-bottom: 1em;
      background: ${colors.bgCode};
      border-radius: 6px;
      padding: 16px;
      overflow-x: auto;
      border: 1px solid ${colors.border};
    }

    pre > code {
      background: none;
      padding: 0;
      border-radius: 0;
      font-size: 0.85em;
      line-height: 1.6;
      color: ${colors.text};
    }

    blockquote {
      margin-bottom: 1em;
      padding: 0.5em 1em;
      border-left: 4px solid ${colors.accent};
      background: ${colors.bgCode};
      border-radius: 0 4px 4px 0;
      color: ${colors.textSecondary};
    }

    blockquote p:last-child {
      margin-bottom: 0;
    }

    table {
      width: 100%;
      margin-bottom: 1em;
      border-collapse: collapse;
      border: 1px solid ${colors.border};
      border-radius: 4px;
      overflow: hidden;
    }

    th, td {
      padding: 8px 12px;
      border: 1px solid ${colors.border};
      text-align: left;
    }

    th {
      background: ${colors.bgCode};
      font-weight: 600;
      color: ${colors.text};
    }

    tr:nth-child(even) {
      background: ${colors.bgCode};
    }

    a {
      color: ${colors.accent};
      text-decoration: none;
    }

    a:hover {
      text-decoration: underline;
    }

    img {
      max-width: 100%;
      height: auto;
      border-radius: 4px;
      margin-bottom: 1em;
    }

    hr {
      margin: 1.5em 0;
      border: none;
      border-top: 1px solid ${colors.border};
    }

    strong {
      font-weight: 600;
      color: ${colors.text};
    }

    em {
      font-style: italic;
    }

    @media print {
      body {
        max-width: none;
        margin: 0;
        padding: 20px;
        background: white;
        color: #1e1e2e;
        font-size: 12pt;
      }

      h1, h2, h3, h4, h5, h6, strong {
        color: #1e1e2e;
      }

      h6 {
        color: #6c7086;
      }

      h1, h2 {
        border-bottom-color: #e0e0e0;
      }

      code {
        background: #f5f5f5;
        color: #444444;
      }

      pre {
        background: #f5f5f5;
        border-color: #e0e0e0;
      }

      pre > code {
        color: #1e1e2e;
      }

      blockquote {
        border-left-color: #1e66f5;
        background: #f5f5f5;
        color: #444444;
      }

      th {
        background: #f5f5f5;
        color: #1e1e2e;
      }

      tr:nth-child(even) {
        background: #f9f9f9;
      }

      table, th, td {
        border-color: #e0e0e0;
      }

      hr {
        border-top-color: #e0e0e0;
      }

      a {
        color: #1e66f5;
        text-decoration: underline;
      }

      img {
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
${renderedHtml}
</body>
</html>`;
}

/**
 * Exports markdown content as a self-contained HTML file.
 * Opens a save dialog for the user to choose the destination.
 */
export async function exportToHtml(
  markdownContent: string,
  fileName: string,
  theme: 'dark' | 'light'
): Promise<void> {
  const title = fileName.replace(/\.md$/i, '');
  const htmlDoc = generateHtmlDocument(markdownContent, title, theme);

  const defaultPath = fileName.replace(/\.md$/i, '.html');

  const path = await save({
    defaultPath,
    filters: [{ name: 'HTML', extensions: ['html'] }],
  });

  if (path) {
    await invoke('write_file', { path, content: htmlDoc });
  }
}

/**
 * Triggers the system print dialog, which allows saving as PDF.
 */
export function printDocument(): void {
  window.print();
}

/**
 * Escapes HTML special characters to prevent injection in the title.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
