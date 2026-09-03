/**
 * Rewrite `package.json` for the StackBlitz template that pkg.pr.new uploads from this directory: inline the workspace
 * catalog versions and drop workspace dependencies on private packages, which the preview never publishes. CI runs this
 * right before `pkg-pr-new publish`; that checkout is disposable, so the edit is made in place.
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { parseWorkspaceCatalog, prepareTemplateManifest, type TemplateManifest } from './template.js';

const projectDir = resolve(import.meta.dirname, '..');
const workspaceDir = resolve(projectDir, '../..');
const manifestPath = resolve(projectDir, 'package.json');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf8')) as T;
}

/** Names of the workspace packages marked private. */
function privateWorkspacePackages(): Set<string> {
  const names = new Set<string>();
  const packagesDir = resolve(workspaceDir, 'packages');

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    // A directory without a manifest is not a package; the tree keeps a placeholder or two.
    const manifestFile = resolve(packagesDir, entry.name, 'package.json');
    if (!existsSync(manifestFile)) continue;

    const { name, private: isPrivate = false } = readJson<{ name: string; private?: boolean }>(manifestFile);

    if (isPrivate) names.add(name);
  }

  return names;
}

const catalog = parseWorkspaceCatalog(readFileSync(resolve(workspaceDir, 'pnpm-workspace.yaml'), 'utf8'));
const privatePackages = privateWorkspacePackages();
const prepared = prepareTemplateManifest(readJson<TemplateManifest>(manifestPath), {
  catalog,
  isPrivate: (name) => privatePackages.has(name),
});

writeFileSync(manifestPath, `${JSON.stringify(prepared, null, 2)}\n`);
console.log(`Prepared ${manifestPath} for the StackBlitz template.`);
