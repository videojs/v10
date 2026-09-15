import { existsSync, readFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DOCS_DIR = join(__dirname, '..', 'docs');

function safePath(framework: string, path: string): string | null {
  if (framework !== 'html' && framework !== 'react') return null;

  if (path.split(/[\\/]/).includes('..')) return null;

  const frameworkDir = join(DOCS_DIR, framework);
  const resolved = resolve(frameworkDir, path);
  const relativePath = relative(frameworkDir, resolved);
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) return null;

  return resolved;
}

export function docExistsInAnyFramework(slug: string): boolean {
  return ['html', 'react'].some((fw) => {
    const mdPath = safePath(fw, `${slug}.md`);

    return mdPath !== null && existsSync(mdPath);
  });
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
