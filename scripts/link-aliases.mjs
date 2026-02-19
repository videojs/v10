import { existsSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const aliases = [
  // directory aliases
  { target: '.claude', path: '.opencode', type: 'junction' },
  { target: '.claude', path: 'agents', type: 'junction' },
  // file aliases
  { target: 'CLAUDE.md', path: 'AGENTS.md', type: 'file' },
];

for (const alias of aliases) {
  const fullPath = resolve(root, alias.path);
  if (!existsSync(fullPath)) {
    symlinkSync(alias.target, fullPath, alias.type);
  }
}
