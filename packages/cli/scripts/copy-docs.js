import { cpSync, existsSync, mkdirSync, rmSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function findWorkspaceRoot(start) {
  let dir = start;
  while (dir !== dirname(dir)) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    dir = dirname(dir);
  }
  throw new Error('Could not find pnpm-workspace.yaml — is this script running inside the monorepo?');
}

const WORKSPACE_ROOT = findWorkspaceRoot(__dirname);
const SITE_DIST = join(WORKSPACE_ROOT, 'site', 'dist');
const CLI_DOCS = join(__dirname, '..', 'docs');

if (!existsSync(SITE_DIST)) {
  console.warn('⚠ site/dist not found — skipping docs copy. Build the site first.');
  process.exit(0);
}

// Clean and recreate docs dir
rmSync(CLI_DOCS, { recursive: true, force: true });
mkdirSync(CLI_DOCS, { recursive: true });

for (const framework of ['html', 'react']) {
  const src = join(SITE_DIST, 'docs', 'framework', framework);
  if (!existsSync(src)) continue;

  const dest = join(CLI_DOCS, framework);
  cpSync(src, dest, {
    recursive: true,
    filter: (path) => {
      if (statSync(path).isDirectory()) return true;
      return path.endsWith('.md') || path.endsWith('.txt');
    },
  });
}

console.log('✓ Docs copied to packages/cli/docs/');
