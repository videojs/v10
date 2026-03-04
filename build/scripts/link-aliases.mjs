/**
 * Creates symlink aliases so that AI coding tools other than Claude Code
 * (e.g., OpenCode, Cursor) can discover project instructions.
 *
 * Aliases created:
 *   .opencode  → .claude       (directory)
 *   agents     → .claude       (directory)
 *   AGENTS.md  → CLAUDE.md     (file)
 *
 * Cross-platform notes:
 * - Directory symlinks use 'junction' type, which works on Windows without
 *   elevated privileges or Developer Mode.
 * - File symlinks ('file' type) require elevated privileges or Developer Mode
 *   on Windows. If creation fails, we log a warning instead of crashing
 *   `pnpm install`. The alias is optional — the canonical files still work.
 */
import { existsSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const aliases = [
  { target: '.claude', path: '.opencode', type: 'junction' },
  { target: '.claude', path: 'agents', type: 'junction' },
  { target: 'CLAUDE.md', path: 'AGENTS.md', type: 'file' },
];

for (const alias of aliases) {
  const fullPath = resolve(root, alias.path);
  if (existsSync(fullPath)) continue;

  try {
    symlinkSync(alias.target, fullPath, alias.type);
  } catch {
    console.warn(`warning: could not create symlink ${alias.path} → ${alias.target}`);
  }
}
