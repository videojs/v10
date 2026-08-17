import { readFile } from 'node:fs/promises';
import { basename, posix, resolve, sep } from 'node:path';

import { collectModuleSpecifiers } from '@videojs/compiler/ast';
import { type CatalogOutputFile, emitCatalog, loadCatalogStyles } from '@videojs/compiler/catalog';
import type { StyleManifest } from '@videojs/compiler/styles';
import type { SkinCatalogDefinition, SkinStyleResources } from '../../../canonical/catalog';
import { type SkinCatalog, type SkinCatalogItem, skinRootClassName } from '../../catalog';
import { createCompilerReactConfig } from '../../transform/react';

type ShadcnSourceFileKind = 'source' | 'style';

export interface ShadcnSourceFile extends CatalogOutputFile {
  kind: ShadcnSourceFileKind;
}

export interface ShadcnSourceItem {
  files: readonly ShadcnSourceFile[];
  dependencies: readonly string[];
  utilities: boolean;
}

export interface ShadcnSourceOutput {
  sharedFiles: readonly ShadcnSourceFile[];
  utilityFiles: readonly ShadcnSourceFile[];
  items: Readonly<Record<string, ShadcnSourceItem>>;
}

interface EmitShadcnSourcesOptions<ItemName extends string = SkinCatalogItem['name']> {
  rootDir: string;
  itemNames?: readonly ItemName[] | undefined;
  variant?: string | undefined;
  iconSet?: string | undefined;
  sourceRoot?: string | undefined;
  installAlias?: string | undefined;
  utility?:
    | {
        source: string;
        target: string;
        importSource: string;
      }
    | undefined;
}

interface ResolvedOptions<ItemName extends string = string> {
  rootDir: string;
  itemNames?: readonly ItemName[] | undefined;
  variant: string;
  iconSet: string;
  sourceRoot: string;
  utility?:
    | {
        source: string;
        target: string;
        importSource: string;
      }
    | undefined;
}

/** Emit the editable React/Tailwind source consumed by the shadcn registry. */
export async function emitShadcnSources<const Definition extends SkinCatalogDefinition>(
  catalog: SkinCatalog<Definition>,
  options: EmitShadcnSourcesOptions<SkinCatalogItem<Definition>['name']>
): Promise<ShadcnSourceOutput> {
  const { installAlias = '@/components/videojs', ...sourceOptions } = options;
  const resolved = resolveOptions(sourceOptions);
  const itemNames = resolved.itemNames ?? catalog.items.map((item) => item.name);
  const styles = await loadCatalogStyles(catalog, itemNames);
  const emitted = await emitCatalog(catalog, {
    items: itemNames,
    compiler: {
      config: (item) => createCompilerConfig(item, resolved, styles),
      configDir: (item) => resolve(resolved.rootDir, itemOutputDir(item, resolved)),
    },
    resolve: {
      file: ({ item, sourceFile }) => sourceOutputPath(item, sourceFile, resolved),
      imports: {
        dependency: ({ dependency }) => {
          const entryFile = sourceOutputPath(dependency, dependency.source, resolved);
          return `${installAlias}/${dependency.name}/${withoutTypeScriptExtension(posix.basename(entryFile))}`;
        },
      },
    },
  });

  const items: Record<string, ShadcnSourceItem> = {};

  for (const name of itemNames) {
    const item = emitted.items[name];

    if (!item) continue;

    const files = item.files.map((file) => createSourceFile(file.path, file.content));
    items[name] = {
      files,
      dependencies: item.dependencies,
      utilities: resolved.utility
        ? files.some((file) =>
            collectModuleSpecifiers(file.content, file.path).includes(resolved.utility!.importSource)
          )
        : false,
    };
  }

  return {
    sharedFiles: await createStyleResourceFiles(catalog.resources.styles, resolved),
    utilityFiles: await createUtilityFiles(resolved),
    items,
  };
}

async function createUtilityFiles(options: ResolvedOptions): Promise<ShadcnSourceFile[]> {
  if (!options.utility) return [];

  const source = await readFile(absoluteSkinPath(options.rootDir, options.utility.source), 'utf8');

  return [createSourceFile(posix.join(options.sourceRoot, options.utility.target), source)];
}

async function createStyleResourceFiles(
  resources: SkinStyleResources,
  options: ResolvedOptions
): Promise<ShadcnSourceFile[]> {
  const files: ShadcnSourceFile[] = [];
  const entries = [
    { source: resources.tailwind.registry, target: resources.tailwind.compiler },
    { source: resources.tailwind.shared, target: resources.tailwind.shared },
    { source: resources.base, target: resources.base },
    ...(resources.shared ?? []).map((path) => ({ source: path, target: path })),
    ...Object.entries(resources.themes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, path]) => ({ source: path, target: path })),
  ];

  for (const entry of entries) {
    const inputFile = absoluteSkinPath(options.rootDir, entry.source);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(options.sourceRoot, toPosixPath(entry.target));

    files.push(createSourceFile(target, source));
  }

  return files;
}

function createSourceFile(path: string, content: string): ShadcnSourceFile {
  return {
    path,
    kind: path.endsWith('.css') ? 'style' : 'source',
    content,
  };
}

function sourceEntryName(source: string): string {
  return basename(source);
}

function withoutTypeScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?ts|tsx)$/, '');
}

function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}

function resolveOptions<ItemName extends string>(
  options: EmitShadcnSourcesOptions<ItemName>
): ResolvedOptions<ItemName> {
  return {
    rootDir: resolve(options.rootDir),
    ...(options.itemNames ? { itemNames: options.itemNames } : {}),
    variant: options.variant ?? 'default',
    iconSet: options.iconSet ?? 'default',
    sourceRoot: options.sourceRoot ?? '',
    ...(options.utility ? { utility: options.utility } : {}),
  };
}

function absoluteSkinPath(rootDir: string, path: string): string {
  return resolve(rootDir, path);
}

function createCompilerConfig(
  item: SkinCatalogItem<SkinCatalogDefinition>,
  options: ResolvedOptions,
  styles: StyleManifest
) {
  return createCompilerReactConfig({
    styles: {
      mode: 'tailwind',
      manifest: styles,
      variant: options.variant,
      compose: Boolean(options.utility),
    },
    iconSet: options.iconSet,
    extendComponents: Boolean(options.utility),
    resolveImport(reference) {
      if (reference.source === '@videojs/utils/style' && options.utility) {
        return { ...reference, source: options.utility.importSource };
      }
      if (reference.source === '@videojs/skins/registry' && options.utility) {
        return { ...reference, source: options.utility.importSource };
      }
      return reference;
    },
    ...(item.type === 'skin' ? { rootClassName: skinRootClassName(item) } : {}),
  });
}

function sourceOutputPath(
  item: SkinCatalogItem<SkinCatalogDefinition>,
  sourceFile: string,
  options: ResolvedOptions
): string {
  const itemDir = itemOutputDir(item, options);
  const entrySource = canonicalPath(item.source);
  const source = canonicalPath(sourceFile);

  return source === entrySource
    ? posix.join(itemDir, sourceEntryName(item.source))
    : privateSourceOutput(itemDir, entrySource, source);
}

function itemOutputDir(item: SkinCatalogItem<SkinCatalogDefinition>, options: ResolvedOptions): string {
  return item.type === 'skin' ? options.sourceRoot : posix.join(options.sourceRoot, 'components', item.name);
}

function privateSourceOutput(itemDir: string, entrySource: string, source: string): string {
  const relative = posix.relative(posix.dirname(entrySource), source);

  return relative.startsWith('../') ? posix.join(itemDir, 'internal', source) : posix.join(itemDir, relative);
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}
