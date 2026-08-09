import { posix } from 'node:path';
import type { SkinRegistryConfig } from '../../src/registry/config';
import type { SourceOutput, SourceOutputFile } from '../source-output';
import type { ResolvedSkinItem, ResolvedSkinManifest } from '../types';

export type RegistryItemType = 'registry:block' | 'registry:component';
export type RegistryFileType = 'registry:component' | 'registry:file';

export interface RegistryFile {
  path: string;
  type: RegistryFileType;
  target: string;
}

export interface RegistryItem {
  name: string;
  type: RegistryItemType;
  title: string;
  description: string;
  files: readonly RegistryFile[];
  dependencies?: readonly string[] | undefined;
  registryDependencies?: readonly string[] | undefined;
  meta: { framework: 'react'; style: 'tailwind'; skin: string };
}

export interface ShadcnRegistry {
  $schema: 'https://ui.shadcn.com/schema/registry.json';
  name: string;
  homepage: string;
  items: readonly RegistryItem[];
}

/** Create the shadcn source manifest for the generated React/Tailwind projection. */
export function createRegistryManifest(
  manifest: ResolvedSkinManifest,
  output: SourceOutput,
  config: SkinRegistryConfig
): ShadcnRegistry {
  const items = new Map(manifest.items.map((item) => [item.name, item]));
  const published = new Set(config.items);

  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: config.name,
    homepage: config.homepage,
    items: config.items.map((name) => {
      const item = items.get(name);
      if (!item) throw new Error(`Registry references missing Skin item \`${name}\`.`);
      const partition = partitionDependencies(item, items, published);
      const files = uniqueFiles(
        partition.included.flatMap((includedName) => {
          const generated = output.items[includedName];
          if (!generated) throw new Error(`Registry output is missing Skin item \`${includedName}\`.`);
          return generated.map((file) => registryFile(file, item.name, config.installRoot));
        })
      );
      const dependencies = [
        ...new Set(partition.included.flatMap((includedName) => output.dependencies[includedName] ?? [])),
      ].sort();

      return {
        name: item.name,
        type: item.type === 'skin' ? 'registry:block' : 'registry:component',
        title: item.title,
        description: item.description,
        files,
        ...(dependencies.length ? { dependencies } : {}),
        ...(partition.dependencies.length
          ? { registryDependencies: partition.dependencies.map((dependency) => `${config.namespace}/${dependency}`) }
          : {}),
        meta: { framework: 'react', style: 'tailwind', skin: 'default-video' },
      };
    }),
  };
}

function partitionDependencies(
  root: ResolvedSkinItem,
  items: ReadonlyMap<string, ResolvedSkinItem>,
  published: ReadonlySet<string>
): { included: string[]; dependencies: string[] } {
  const included = new Set<string>();
  const dependencies = new Set<string>();

  const visit = (name: string): void => {
    if (name !== root.name && published.has(name)) {
      dependencies.add(name);
      return;
    }
    if (included.has(name)) return;
    included.add(name);
    const item = items.get(name);
    if (!item) throw new Error(`Skin item \`${root.name}\` depends on missing item \`${name}\`.`);
    for (const dependency of item.dependencies.items) visit(dependency);
  };

  visit(root.name);
  return { included: [...included].sort(), dependencies: [...dependencies].sort() };
}

function registryFile(file: SourceOutputFile, owner: string, installRoot: string): RegistryFile {
  return {
    path: posix.join('src/registry', file.path),
    target: registryTarget(file.path, owner, installRoot),
    type: file.kind === 'source' ? 'registry:component' : 'registry:file',
  };
}

function registryTarget(path: string, owner: string, installRoot: string): string {
  const relativePath = path.replace(/^default\//, '');
  if (relativePath === 'skin.tsx') return posix.join(installRoot, owner, relativePath);
  if (relativePath.startsWith('components/')) {
    return posix.join(installRoot, relativePath.replace(/^components\//, ''));
  }
  return posix.join(installRoot, relativePath);
}

function uniqueFiles(files: readonly RegistryFile[]): RegistryFile[] {
  const unique = new Map<string, RegistryFile>();
  for (const file of files) {
    const key = `${file.path}\0${file.target}`;
    unique.set(key, file);
  }
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}
