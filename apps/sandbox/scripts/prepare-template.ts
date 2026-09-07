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

/** Package manifests under `packages/`, descending one level into bucket directories such as `adapters/`. */
function workspaceManifestFiles(): string[] {
  const packagesDir = resolve(workspaceDir, 'packages');
  const manifests: string[] = [];

  for (const entry of readdirSync(packagesDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;

    const manifestFile = resolve(packagesDir, entry.name, 'package.json');

    if (existsSync(manifestFile)) {
      manifests.push(manifestFile);
      continue;
    }

    // A directory without a manifest is a bucket of packages or a placeholder.
    for (const child of readdirSync(resolve(packagesDir, entry.name), { withFileTypes: true })) {
      const childManifest = resolve(packagesDir, entry.name, child.name, 'package.json');

      if (child.isDirectory() && existsSync(childManifest)) manifests.push(childManifest);
    }
  }

  return manifests;
}

/** Names of the workspace packages marked private. */
function privateWorkspacePackages(): Set<string> {
  const names = new Set<string>();

  for (const manifestFile of workspaceManifestFiles()) {
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
