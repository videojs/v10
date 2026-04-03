import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, '..', 'docs');

export function readBundledDoc(framework: string, slug: string): string | null {
  // Try slug.md (the llms-markdown integration writes e.g. how-to/installation.md)
  const mdPath = join(DOCS_DIR, framework, `${slug}.md`);
  if (existsSync(mdPath)) {
    return readFileSync(mdPath, 'utf-8');
  }
  return null;
}

export function readLlmsTxt(framework: string): string | null {
  const txtPath = join(DOCS_DIR, framework, 'llms.txt');
  if (existsSync(txtPath)) {
    return readFileSync(txtPath, 'utf-8');
  }
  return null;
}
