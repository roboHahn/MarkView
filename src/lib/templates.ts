export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  content: string;
  isBuiltIn: boolean;
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

const builtInTemplates: Template[] = [
  {
    id: 'blog-post',
    name: 'Blog Post',
    description: 'A structured blog post with frontmatter',
    icon: '📝',
    content: `---\ntitle: My Blog Post\ndate: ${today()}\nauthor: \ntags: []\n---\n\n# My Blog Post\n\n## Introduction\n\nWrite your introduction here...\n\n## Main Content\n\nYour main content goes here.\n\n## Conclusion\n\nWrap up your thoughts here.\n`,
    isBuiltIn: true,
  },
  {
    id: 'meeting-notes',
    name: 'Meeting Notes',
    description: 'Template for meeting minutes',
    icon: '📋',
    content: `# Meeting Notes\n\n**Date:** ${today()}\n**Attendees:** \n\n## Agenda\n\n1. \n2. \n3. \n\n## Discussion\n\n### Topic 1\n\n### Topic 2\n\n## Action Items\n\n- [ ] \n- [ ] \n\n## Next Meeting\n\n**Date:** \n**Topics:** \n`,
    isBuiltIn: true,
  },
  {
    id: 'readme',
    name: 'README',
    description: 'Project README template',
    icon: '📖',
    content: `# Project Name\n\nShort description of the project.\n\n## Installation\n\n\`\`\`bash\nnpm install\n\`\`\`\n\n## Usage\n\n\`\`\`bash\nnpm start\n\`\`\`\n\n## Features\n\n- Feature 1\n- Feature 2\n\n## Contributing\n\n1. Fork the repo\n2. Create a feature branch\n3. Commit your changes\n4. Open a Pull Request\n\n## License\n\nMIT\n`,
    isBuiltIn: true,
  },
  {
    id: 'changelog',
    name: 'Changelog',
    description: 'Keep a changelog format',
    icon: '📜',
    content: `# Changelog\n\nAll notable changes to this project will be documented in this file.\n\n## [Unreleased]\n\n### Added\n\n### Changed\n\n### Fixed\n\n### Removed\n\n## [1.0.0] - ${today()}\n\n### Added\n- Initial release\n`,
    isBuiltIn: true,
  },
  {
    id: 'daily-note',
    name: 'Daily Note',
    description: 'Daily journal/note template',
    icon: '📅',
    content: `# Daily Note — ${today()}\n\n## Tasks\n\n- [ ] \n- [ ] \n- [ ] \n\n## Notes\n\n\n\n## Ideas\n\n\n\n## End of Day Review\n\n**What went well:**\n\n**What could improve:**\n`,
    isBuiltIn: true,
  },
  {
    id: 'presentation',
    name: 'Presentation',
    description: 'Slide-based presentation (--- separator)',
    icon: '🎬',
    content: `---\n\n# Presentation Title\n\nAuthor Name\n\n---\n\n## Slide 1\n\nContent for slide 1\n\n---\n\n## Slide 2\n\n- Point 1\n- Point 2\n- Point 3\n\n---\n\n## Thank You\n\nQuestions?\n`,
    isBuiltIn: true,
  },
];

const STORAGE_KEY = 'markview-custom-templates';

class TemplateManager {
  getAll(): Template[] {
    return [...builtInTemplates, ...this.getCustom()];
  }

  getCustom(): Template[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* ignore */ }
    return [];
  }

  saveCustom(name: string, content: string): Template {
    const custom = this.getCustom();
    const template: Template = {
      id: 'custom-' + Date.now(),
      name,
      description: 'Custom template',
      icon: '📄',
      content,
      isBuiltIn: false,
    };
    custom.push(template);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
    return template;
  }

  deleteCustom(id: string) {
    const custom = this.getCustom().filter(t => t.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(custom));
  }
}

export const templateManager = new TemplateManager();
