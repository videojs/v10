import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, '..', 'docs');

function safePath(...segments: string[]): string | null {
  const resolved = resolve(DOCS_DIR, ...segments);
  if (!resolved.startsWith(resolve(DOCS_DIR) + '/')) return null;
  return resolved;
}

export function docExistsInAnyFramework(slug: string): boolean {
  return ['html', 'react'].some((fw) => {
    const mdPath = safePath(fw, `${slug}.md`);
    return mdPath !== null && existsSync(mdPath);
  });
}

function stripLlmsFooter(content: string): string {
  return content.replace(/\n---\n\n(\w+ documentation: https:\/\/.*\n)?All documentation: https:\/\/.*\n*$/, '');
}

export function readBundledDoc(framework: string, slug: string): string | null {
  const mdPath = safePath(framework, `${slug}.md`);
  if (!mdPath || !existsSync(mdPath)) return null;
  return stripLlmsFooter(readFileSync(mdPath, 'utf-8'));
}

export function readLlmsTxt(framework: string): string | null {
  const txtPath = safePath(framework, 'llms.txt');
  if (!txtPath || !existsSync(txtPath)) return null;
  return stripLlmsFooter(readFileSync(txtPath, 'utf-8'));
}
