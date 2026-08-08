import { posix } from 'node:path';
import type { RegistryOutput, RegistryOutputFile, RegistryVariant } from './generate';
import type { PublishedRegistryItem, ResolvedRegistry, ResolvedRegistryItem } from './types';

export type CatalogItemType = 'registry:block' | 'registry:component';
export type CatalogFileType = 'registry:component' | 'registry:file';

export interface CatalogFile {
  path: string;
  type: CatalogFileType;
  target: string;
  content: string;
}

export interface CatalogItem {
  name: string;
  type: CatalogItemType;
  title: string;
  description: string;
  files: readonly CatalogFile[];
  dependencies?: readonly string[] | undefined;
  registryDependencies?: readonly string[] | undefined;
  meta: RegistryVariant & { ownership: 'source' };
}

export interface RegistryCatalog {
  $schema: 'https://ui.shadcn.com/schema/registry.json';
  name: 'videojs';
  homepage: 'https://videojs.org';
  items: readonly CatalogItem[];
}

export interface CreateRegistryCatalogOptions {
  target: RegistryVariant;
  output: RegistryOutput;
  ref?: string | undefined;
  repository?: `${string}/${string}` | undefined;
  sourceRoot: string;
  installRoot?: string | undefined;
}

export function createRegistryCatalog(
  registry: ResolvedRegistry,
  {
    target,
    output,
    ref,
    repository = 'videojs/v10',
    sourceRoot,
    installRoot = 'components/videojs',
  }: CreateRegistryCatalogOptions
): RegistryCatalog {
  const items = new Map(registry.items.map((item) => [item.name, item]));
  const published = registry.items.filter((item) => isPublishedForTarget(item, target.framework));
  const publishedNames = new Set(published.map((item) => item.name));

  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'videojs',
    homepage: 'https://videojs.org',
    items: published.map((item) => {
      const { included, dependencies } = partitionDependencies(item, items, publishedNames, target.framework);
      const files = uniqueFiles(
        included.flatMap((name) => {
          const generated = output.items[name];
          if (!generated) throw new Error(`Registry output is missing item \`${name}\`.`);
          return generated.map((file) => catalogFile(file, sourceRoot, installRoot));
        })
      );
      const packageDependencies = [...new Set(included.flatMap((name) => output.dependencies[name] ?? []))].sort();

      return {
        name: catalogItemName(target, item.name),
        type: item.type === 'skin' ? 'registry:block' : 'registry:component',
        title: `${item.title} (${frameworkTitle(target.framework)}, ${styleTitle(target.style)})`,
        description: `${item.description} ${frameworkTitle(target.framework)} source with ${styleDescription(target.style)}.`,
        files,
        ...(packageDependencies.length ? { dependencies: packageDependencies } : {}),
        ...(dependencies.length
          ? {
              registryDependencies: dependencies.map(
                (name) => `${repository}/${catalogItemName(target, name)}${ref ? `#${ref}` : ''}`
              ),
            }
          : {}),
        meta: { ...target, ownership: 'source' },
      };
    }),
  };
}

export function mergeRegistryCatalogs(catalogs: readonly RegistryCatalog[]): RegistryCatalog {
  const items = catalogs.flatMap((catalog) => catalog.items).sort((a, b) => a.name.localeCompare(b.name));
  return {
    $schema: 'https://ui.shadcn.com/schema/registry.json',
    name: 'videojs',
    homepage: 'https://videojs.org',
    items,
  };
}

function isPublishedForTarget(
  item: ResolvedRegistryItem,
  framework: RegistryVariant['framework']
): item is ResolvedRegistryItem & PublishedRegistryItem {
  return !item.internal && item.targets.includes(framework);
}

function partitionDependencies(
  root: ResolvedRegistryItem,
  items: ReadonlyMap<string, ResolvedRegistryItem>,
  publishedNames: ReadonlySet<string>,
  framework: RegistryVariant['framework']
): { included: string[]; dependencies: string[] } {
  // HTML rendering flattens a complete Skin closure into the root item.
  if (framework === 'html') return { included: [root.name], dependencies: [] };
  const included = new Set<string>();
  const dependencies = new Set<string>();

  const visit = (name: string): void => {
    if (name !== root.name && publishedNames.has(name)) {
      dependencies.add(name);
      return;
    }
    if (included.has(name)) return;
    included.add(name);
    const item = items.get(name);
    if (!item) throw new Error(`Registry item \`${root.name}\` depends on missing item \`${name}\`.`);
    for (const dependency of item.dependencies.items) visit(dependency);
  };

  visit(root.name);
  return { included: [...included].sort(), dependencies: [...dependencies].sort() };
}

function catalogFile(file: RegistryOutputFile, sourceRoot: string, installRoot: string): CatalogFile {
  return {
    path: posix.join(sourceRoot, file.path),
    target: posix.join(installRoot, file.path),
    type: file.kind === 'source' ? 'registry:component' : 'registry:file',
    content: file.content,
  };
}

function uniqueFiles(files: readonly CatalogFile[]): CatalogFile[] {
  const unique = new Map<string, CatalogFile>();
  for (const file of files) {
    const key = `${file.path}\0${file.target}`;
    const existing = unique.get(key);
    if (existing && existing.content !== file.content) throw new Error(`Registry output collision: ${file.path}`);
    unique.set(key, file);
  }
  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function catalogItemName(target: RegistryVariant, itemName: string): string {
  return `${target.framework}/${target.style}/${itemName}`;
}

function frameworkTitle(framework: RegistryVariant['framework']): string {
  return framework === 'react' ? 'React' : 'HTML';
}

function styleTitle(style: RegistryVariant['style']): string {
  return style === 'tailwind' ? 'Tailwind' : 'CSS';
}

function styleDescription(style: RegistryVariant['style']): string {
  return style === 'tailwind' ? 'Tailwind styling' : 'vanilla CSS';
}
