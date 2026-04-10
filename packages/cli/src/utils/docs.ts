import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, '..', 'docs');

function safePath(...segments: string[]): string | null {
  const resolved = resolve(DOCS_DIR, ...segments);
  if (!resolved.startsWith(resolve(DOCS_DIR))) return null;
  return resolved;
}

export function readBundledDoc(framework: string, slug: string): string | null {
  const mdPath = safePath(framework, `${slug}.md`);
  if (!mdPath || !existsSync(mdPath)) return null;
  return readFileSync(mdPath, 'utf-8');
}

export function readLlmsTxt(framework: string): string | null {
  const txtPath = safePath(framework, 'llms.txt');
  if (!txtPath || !existsSync(txtPath)) return null;
  return readFileSync(txtPath, 'utf-8');
}
