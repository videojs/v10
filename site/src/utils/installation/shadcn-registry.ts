import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

import type { BundledLanguage } from 'shiki';

import type { ShadcnCatalogItem, ShadcnFramework, ShadcnStyling } from './shadcn';

const workspaceRoot = basename(process.cwd()) === 'site' ? resolve(process.cwd(), '..') : process.cwd();
const registryRoot = resolve(workspaceRoot, 'packages/skins/dist/registry/r');

export interface RegistrySourceFile {
  readonly code: string;
  readonly lang: BundledLanguage;
  readonly path: string;
}

export interface RegistryInstallationModel {
  readonly dependencies: readonly string[];
  readonly entryPaths: readonly string[];
  readonly externalRegistryDependencies: readonly string[];
  readonly files: readonly RegistrySourceFile[];
  readonly item: ShadcnCatalogItem;
}

/** Read one generated registry item and its exact Video.js dependency closure. */
export async function loadRegistryInstallation(
  framework: ShadcnFramework,
  styling: ShadcnStyling,
  name: string
): Promise<RegistryInstallationModel> {
  const catalog = catalogDirectory(framework, styling);
  const files = new Map<string, RegistrySourceFile>();
  const dependencies = new Set<string>();
  const externalRegistryDependencies = new Set<string>();
  const visited = new Set<string>();
  let root: ShadcnCatalogItem | undefined;

  const visit = async (itemName: string): Promise<void> => {
    if (visited.has(itemName)) return;

    visited.add(itemName);
    const item = await readRegistryItem(catalog, itemName);

    root ??= item;

    for (const dependency of item.dependencies ?? []) dependencies.add(dependency);

    for (const dependency of item.registryDependencies ?? []) {
      if (dependency.startsWith('@videojs/')) {
        await visit(dependency.slice('@videojs/'.length));
      } else {
        externalRegistryDependencies.add(dependency);
      }
    }

    for (const file of item.files ?? []) {
      if (!file.target || file.content === undefined) continue;

      const path = installedPath(file.target);
      const source = { code: file.content, lang: languageFor(path), path };
      const previous = files.get(path);

      if (previous && previous.code !== source.code) {
        throw new Error(`Registry dependency closure has conflicting contents for \`${path}\`.`);
      }

      files.set(path, source);
    }
  };

  await visit(name);

  if (!root) throw new Error(`Registry item \`${name}\` did not resolve.`);

  return {
    dependencies: [...dependencies].sort(),
    entryPaths: (root.files ?? []).flatMap((file) => (file.target ? [installedPath(file.target)] : [])),
    externalRegistryDependencies: [...externalRegistryDependencies].sort(),
    files: [...files.values()].sort((left, right) => left.path.localeCompare(right.path)),
    item: root,
  };
}

/** Find the editable registry item that corresponds directly to one public React component. */
export async function registryItemForComponent(component: string): Promise<string | null> {
  const name = componentItemName(component);
  const catalog = await readRegistryCatalog('react', 'tailwind');
  const item = catalog.items.find((candidate) => candidate.name === name && candidate.type === 'registry:ui');

  return item ? name : null;
}

/** Read the searchable generated catalog for documentation and discovery. */
export async function readRegistryCatalog(
  framework: ShadcnFramework,
  styling: ShadcnStyling
): Promise<{ readonly items: readonly ShadcnCatalogItem[] }> {
  const source = await readFile(resolve(catalogDirectory(framework, styling), 'registry.json'), 'utf8');

  // SAFETY: `build:shadcn` validates this generated file against Shadcn's official registry schema before site tasks run.
  return JSON.parse(source) as { readonly items: readonly ShadcnCatalogItem[] };
}

async function readRegistryItem(directory: string, name: string): Promise<ShadcnCatalogItem> {
  const source = await readFile(resolve(directory, `${name}.json`), 'utf8');

  // SAFETY: `build:shadcn` validates every generated item against Shadcn's official registry schema before site tasks run.
  return JSON.parse(source) as ShadcnCatalogItem;
}

function catalogDirectory(framework: ShadcnFramework, styling: ShadcnStyling): string {
  return resolve(registryRoot, framework, styling === 'css' ? 'css' : '');
}

function installedPath(target: string): string {
  return target.replace(/^@components\//, 'components/').replace(/^@\//, '');
}

function componentItemName(component: string): string {
  const overrides = new Map([
    ['AirPlayButton', 'airplay-button'],
    ['PiPButton', 'pip-button'],
    ['PlayerContainer', 'container'],
  ]);

  return (
    overrides.get(component) ??
    component
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
      .toLowerCase()
  );
}

function languageFor(path: string): BundledLanguage {
  if (path.endsWith('.css')) return 'css';

  if (path.endsWith('.html')) return 'html';

  if (path.endsWith('.tsx')) return 'tsx';

  if (path.endsWith('.ts')) return 'ts';

  if (path.endsWith('.jsx')) return 'jsx';

  if (path.endsWith('.js')) return 'js';

  throw new Error(`Unsupported registry source extension: ${path}`);
}
