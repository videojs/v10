/**
 * Exposes the checked-in, host-neutral skill catalog through client-specific
 * discovery paths:
 *
 *   skills/<skill-name>/SKILL.md  (source)
 *   .agents/skills                (generated junction)
 *   .claude/skills                (generated junction)
 *   .claude/plans                 (generated junction)
 *   .opencode                     (generated junction)
 *
 * Directory junctions work on Windows without elevated privileges. Failures
 * warn instead of breaking `pnpm install`.
 */
import { lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const agentsDir = join(root, '.agents');
const skillsDir = join(root, 'skills');

function linkState(path) {
  try {
    return lstatSync(path);
  } catch {
    return undefined;
  }
}

function ensureAlias(relativePath, target) {
  const path = resolve(root, relativePath);
  const state = linkState(path);

  if (state?.isSymbolicLink()) {
    try {
      if (resolve(dirname(path), readlinkSync(path)) === resolve(target)) return;
    } catch {
      // Replace a dangling generated link below.
    }
    unlinkSync(path);
  } else if (state) {
    console.warn(`warning: refusing to replace non-generated ${relativePath}`);
    return;
  }

  mkdirSync(dirname(path), { recursive: true });
  try {
    symlinkSync(target, path, 'junction');
  } catch {
    console.warn(`warning: could not create alias ${relativePath} → ${target}`);
  }
}

mkdirSync(join(agentsDir, 'plans'), { recursive: true });

ensureAlias('.agents/skills', skillsDir);
ensureAlias('.claude/skills', skillsDir);
ensureAlias('.claude/plans', join(agentsDir, 'plans'));
ensureAlias('.opencode', agentsDir);
