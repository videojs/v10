import { readFile } from 'node:fs/promises';
import { basename, posix, resolve, sep } from 'node:path';

import { collectModuleSpecifiers } from '@videojs/compiler/ast';
import { type CatalogOutputFile, emitCatalog, resolveCatalog } from '@videojs/compiler/catalog';
import {
  emitRegistry,
  type Registry,
  type RegistryConfig,
  type RegistryFile,
  type RegistryFileType,
} from '@videojs/compiler/shadcn';
import type { skinCatalog } from '../../canonical/catalog';
import { type SkinCatalog, type SkinCatalogItem, skinRootClassName } from '../catalog';
import { createCompilerReactConfig } from '../transform/react';

type CatalogRegistryConfig = RegistryConfig<typeof skinCatalog>;

type ShadcnSourceFileKind = 'source' | 'style';

interface ShadcnSourceFile extends CatalogOutputFile {
  kind: ShadcnSourceFileKind;
}

interface ShadcnSourceItem {
  files: readonly ShadcnSourceFile[];
  dependencies: readonly string[];
  utilities: boolean;
}

interface ShadcnSources {
  sharedFiles: readonly ShadcnSourceFile[];
  utilityFiles: readonly ShadcnSourceFile[];
  items: Readonly<Record<string, ShadcnSourceItem>>;
}

interface SourceOptions {
  rootDir: string;
  variant: string;
  iconSet: string;
  sourceRoot: string;
  installAlias: string;
  utility: {
    source: string;
    target: string;
    importSource: string;
  };
}

interface ShadcnRegistryOutput {
  files: readonly ShadcnSourceFile[];
  registry: Registry;
}

/** Emit the editable React/Tailwind files and shadcn registry for canonical Skins. */
export async function emitShadcnRegistry(
  catalog: SkinCatalog,
  config: CatalogRegistryConfig
): Promise<ShadcnRegistryOutput> {
  const resolved = resolveCatalog(catalog, [config.entry]);
  const skin = catalog.items.find((item) => item.name === config.entry);

  if (skin?.type !== 'skin') throw new Error(`Registry entry \`${config.entry}\` is not a Skin.`);

  const itemNames = [...new Set([...resolved.items.map((item) => item.name), ...config.items])];

  const sourceOptions: SourceOptions = {
    rootDir: catalog.rootDir,
    variant: skin.style.variant,
    iconSet: 'default',
    sourceRoot: config.sourceRoot,
    installAlias: `@/${config.installRoot}`,
    utility: {
      source: config.utilityItem.source,
      target: config.utilityItem.target,
      importSource: `@/${config.installRoot}/${config.utilityItem.target.replace(/\.ts$/, '')}`,
    },
  };

  const sources = await emitSources(catalog, itemNames, sourceOptions);

  return {
    files: [
      ...sources.sharedFiles,
      ...sources.utilityFiles,
      ...Object.values(sources.items).flatMap((item) => item.files),
    ],
    registry: createManifest(catalog, sources, config),
  };
}

async function emitSources(
  catalog: SkinCatalog,
  itemNames: readonly SkinCatalogItem['name'][],
  options: SourceOptions
): Promise<ShadcnSources> {
  const emitted = await emitCatalog(catalog, {
    items: itemNames,
    transform: {
      compiler: (catalogItem) => createCompilerConfig(catalogItem, options),
      configDir: (catalogItem) => resolve(options.rootDir, itemOutputDir(catalogItem, options)),
      styles: {
        mode: 'tailwind',
        variant: options.variant,
        compose: true,
      },
    },
    files: {
      source: ({ catalogItem, sourceFile }) => sourceOutputPath(catalogItem, sourceFile, options),
    },
    resolve: {
      imports: {
        dependency: ({ dependency }) => {
          const entryFile = sourceOutputPath(dependency, dependency.source, options);

          return `${options.installAlias}/${dependency.name}/${withoutTypeScriptExtension(posix.basename(entryFile))}`;
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
      utilities: files.some((file) =>
        collectModuleSpecifiers(file.content, file.path).includes(options.utility.importSource)
      ),
    };
  }

  return {
    sharedFiles: await createStyleResourceFiles(catalog.resources.styles, options),
    utilityFiles: await createUtilityFiles(options),
    items,
  };
}

async function createUtilityFiles(options: SourceOptions): Promise<ShadcnSourceFile[]> {
  const source = await readFile(absoluteSkinPath(options.rootDir, options.utility.source), 'utf8');

  return [createSourceFile(posix.join(options.sourceRoot, options.utility.target), source)];
}

async function createStyleResourceFiles(
  resources: SkinCatalog['resources']['styles'],
  options: SourceOptions
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

function absoluteSkinPath(rootDir: string, path: string): string {
  return resolve(rootDir, path);
}

function createCompilerConfig(item: SkinCatalogItem, options: SourceOptions) {
  return createCompilerReactConfig({
    iconSet: options.iconSet,
    extendComponents: true,
    resolveImport(reference) {
      if (reference.source === '@videojs/utils/style') {
        return { ...reference, source: options.utility.importSource };
      }
      if (reference.source === '@videojs/skins/registry') {
        return { ...reference, source: options.utility.importSource };
      }
      return reference;
    },
    ...(item.type === 'skin' ? { rootClassName: skinRootClassName(item) } : {}),
  });
}

function sourceOutputPath(item: SkinCatalogItem, sourceFile: string, options: SourceOptions): string {
  const itemDir = itemOutputDir(item, options);
  const entrySource = canonicalPath(item.source);
  const source = canonicalPath(sourceFile);

  return source === entrySource
    ? posix.join(itemDir, sourceEntryName(item.source))
    : privateSourceOutput(itemDir, entrySource, source);
}

function itemOutputDir(item: SkinCatalogItem, options: SourceOptions): string {
  return item.type === 'skin' ? options.sourceRoot : posix.join(options.sourceRoot, 'components', item.name);
}

function privateSourceOutput(itemDir: string, entrySource: string, source: string): string {
  const relative = posix.relative(posix.dirname(entrySource), source);

  return relative.startsWith('../') ? posix.join(itemDir, 'internal', source) : posix.join(itemDir, relative);
}

function createManifest(catalog: SkinCatalog, sources: ShadcnSources, config: CatalogRegistryConfig): Registry {
  const meta = { framework: config.framework, style: config.style, skin: config.entry } as const;

  return emitRegistry(catalog, {
    name: config.name,
    homepage: config.homepage,
    namespace: config.namespace,
    items: {
      published: config.items,
      emitted: sources.items,
      shared: [
        {
          ...config.styleItem,
          type: 'registry:style',
          files: sources.sharedFiles,
          meta,
        },
        {
          ...config.utilityItem,
          type: 'registry:lib',
          files: sources.utilityFiles,
          meta,
        },
      ],
      describe: (item) => ({
        type: item.type === 'skin' ? 'registry:block' : 'registry:component',
        title: item.title,
        description: item.description,
        meta,
      }),
    },
    resolve: {
      dependencies: ({ includedItems }) => [
        config.styleItem.name,
        ...(includedItems.some((item) => sources.items[item.name]?.utilities) ? [config.utilityItem.name] : []),
      ],
      file: (file, owner) =>
        createRegistryFile(file, owner, config, owner === config.utilityItem.name ? 'registry:lib' : undefined),
    },
  });
}

function createRegistryFile(
  file: ShadcnSourceFile,
  owner: string,
  config: CatalogRegistryConfig,
  sourceType?: RegistryFileType
): RegistryFile {
  return {
    path: posix.join(config.outputDir, file.path),
    target: resolveRegistryTarget(file.path, owner, config),
    type: file.kind === 'source' ? (sourceType ?? 'registry:component') : 'registry:file',
  };
}

function resolveRegistryTarget(path: string, owner: string, config: CatalogRegistryConfig): string {
  const sourcePrefix = `${config.sourceRoot}/`;

  if (!path.startsWith(sourcePrefix)) {
    throw new Error(`Registry source file \`${path}\` must be inside \`${config.sourceRoot}\`.`);
  }

  const relativePath = path.slice(sourcePrefix.length);

  if (relativePath === 'skin.tsx') return posix.join(config.installRoot, owner, relativePath);

  if (relativePath.startsWith('components/')) {
    return posix.join(config.installRoot, relativePath.replace(/^components\//, ''));
  }

  return posix.join(config.installRoot, relativePath);
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}
