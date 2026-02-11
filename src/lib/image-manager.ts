export interface ImageData {
  path: string;
  name: string;
  size: number;
  extension: string;
  usedIn: string[];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function generateImageMarkdown(name: string, relativePath: string): string {
  return `![${name}](${relativePath})`;
}

export function isImageUsed(image: ImageData): boolean {
  return image.usedIn.length > 0;
}
