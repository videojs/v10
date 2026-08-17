import { readFile } from 'node:fs/promises';
import { basename, posix, resolve, sep } from 'node:path';

import { collectModuleSpecifiers } from '@videojs/compiler/ast';
import { loadCatalogStyles } from '@videojs/compiler/catalog';
import { emitRegistry, type RegistrySourceFile } from '@videojs/compiler/registry';
import type { StyleManifest } from '@videojs/compiler/styles';
import type { SkinStyleResources } from '../../canonical/catalog';
import type { SkinCatalog, SkinCatalogItem } from '../catalog';
import { createCompilerReactConfig } from '../compiler/react';
import { skinRootClassName } from '../compiler/skin-root';

type RegistrySourceFileKind = 'source' | 'style';

export interface SkinRegistryFile extends RegistrySourceFile {
  kind: RegistrySourceFileKind;
}

export interface RegistrySourceItem {
  files: readonly SkinRegistryFile[];
  dependencies: readonly string[];
  utilities: boolean;
}

export interface RegistrySourceOutput {
  sharedFiles: readonly SkinRegistryFile[];
  utilityFiles: readonly SkinRegistryFile[];
  items: Readonly<Record<string, RegistrySourceItem>>;
}

interface GenerateReactRegistryOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
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

interface ResolvedRegistrySourceOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
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

/** Emit the editable React/Tailwind source projection consumed by the shadcn registry. */
export async function generateReactRegistry(
  catalog: SkinCatalog,
  options: GenerateReactRegistryOptions
): Promise<RegistrySourceOutput> {
  const { installAlias = '@/components/videojs', ...sourceOptions } = options;
  const resolved = resolveOptions(sourceOptions);
  const itemNames = resolved.itemNames ?? catalog.items.map((item) => item.name);
  const styles = await loadCatalogStyles(catalog, itemNames);
  const emitted = await emitRegistry(catalog, {
    items: itemNames,
    compiler: {
      config: (item) => createRegistryCompilerConfig(item, resolved, styles),
      configDir: (item) => resolve(resolved.rootDir, registryItemDir(item, resolved)),
    },
    resolve: {
      file: ({ item, sourceFile }) => registrySourceOutput(item, sourceFile, resolved),
      imports: {
        dependency: ({ dependency }) => {
          const entryFile = registrySourceOutput(dependency, dependency.source, resolved);
          return `${installAlias}/${dependency.name}/${withoutTypeScriptExtension(posix.basename(entryFile))}`;
        },
      },
    },
  });
  const items: Record<string, RegistrySourceItem> = {};

  for (const [name, item] of Object.entries(emitted.items)) {
    if (!item) continue;
    const files = item.files.map((file) => createRegistrySourceFile(file.path, file.content));
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

async function createUtilityFiles(options: ResolvedRegistrySourceOptions): Promise<SkinRegistryFile[]> {
  if (!options.utility) return [];
  const source = await readFile(absoluteSkinPath(options.rootDir, options.utility.source), 'utf8');
  return [createRegistrySourceFile(posix.join(options.sourceRoot, options.utility.target), source)];
}

async function createStyleResourceFiles(
  resources: SkinStyleResources,
  options: ResolvedRegistrySourceOptions
): Promise<SkinRegistryFile[]> {
  const files: SkinRegistryFile[] = [];
  const entries = [
    { path: resources.tailwind, transform: rewriteTailwindInput },
    { path: resources.base },
    ...(resources.shared ?? []).map((path) => ({ path })),
    ...Object.entries(resources.themes)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, path]) => ({ path })),
  ];
  for (const entry of entries) {
    const inputFile = absoluteSkinPath(options.rootDir, entry.path);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(options.sourceRoot, toPosixPath(entry.path));
    const content = entry.transform ? entry.transform(source, inputFile) : source;
    files.push(createRegistrySourceFile(target, content));
  }
  return files;
}

function createRegistrySourceFile(path: string, content: string): SkinRegistryFile {
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

function resolveOptions(options: GenerateReactRegistryOptions): ResolvedRegistrySourceOptions {
  return {
    rootDir: resolve(options.rootDir),
    ...(options.itemNames ? { itemNames: options.itemNames } : {}),
    variant: options.variant ?? 'default',
    iconSet: options.iconSet ?? 'default',
    sourceRoot: options.sourceRoot ?? '',
    ...(options.utility ? { utility: options.utility } : {}),
  };
}

function rewriteTailwindInput(source: string, inputFile: string): string {
  // Tailwind directives are outside Lightning CSS's typed AST. Rewrite only
  // anchored top-level directive headers and require each semantic marker once.
  let output = replaceRequiredMarker(
    source,
    /^@import\s+(["'])tailwindcss\1\s+theme\(inline\)\s*;\s*$/m,
    '@import "tailwindcss";',
    inputFile,
    'inline Tailwind import'
  );
  output = replaceRequiredMarker(output, /^@theme\s+inline\s*\{/m, '@theme inline {', inputFile, 'inline theme block');
  output = replaceRequiredMarker(
    output,
    /^\s*--spacing:\s*var\(--media-spacing\);\s*$/m,
    '',
    inputFile,
    'scoped Skin spacing bridge'
  );
  output = output.replace(/^@source\s+.+;\s*$/gm, '').trim();
  const header = output.match(/^(?:(?:@layer\s+[^\n{]+|@import[^\n]+);\s*)+/)?.[0];
  if (!header || !/^@import/m.test(header)) {
    throw new Error(`Tailwind source entry \`${inputFile}\` must begin with a layer prelude and imports.`);
  }
  return `${header.trim()}\n\n@source "../**/*.{ts,tsx,html}";\n\n${output.slice(header.length).trimStart()}\n`;
}

function replaceRequiredMarker(
  source: string,
  pattern: RegExp,
  replacement: string,
  inputFile: string,
  description: string
): string {
  const matches = source.match(
    new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)
  );
  if (matches?.length !== 1) {
    throw new Error(`Tailwind source entry \`${inputFile}\` must contain exactly one ${description}.`);
  }
  return source.replace(pattern, replacement);
}

function absoluteSkinPath(rootDir: string, path: string): string {
  return resolve(rootDir, path);
}

function createRegistryCompilerConfig(
  item: SkinCatalogItem,
  options: ResolvedRegistrySourceOptions,
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

function registrySourceOutput(
  item: SkinCatalogItem,
  sourceFile: string,
  options: ResolvedRegistrySourceOptions
): string {
  const itemDir = registryItemDir(item, options);
  const entrySource = canonicalPath(item.source);
  const source = canonicalPath(sourceFile);
  return source === entrySource
    ? posix.join(itemDir, sourceEntryName(item.source))
    : privateSourceOutput(itemDir, entrySource, source);
}

function registryItemDir(item: SkinCatalogItem, options: ResolvedRegistrySourceOptions): string {
  return item.type === 'skin' ? options.sourceRoot : posix.join(options.sourceRoot, 'components', item.name);
}

function privateSourceOutput(itemDir: string, entrySource: string, source: string): string {
  const relative = posix.relative(posix.dirname(entrySource), source);
  return relative.startsWith('../') ? posix.join(itemDir, 'internal', source) : posix.join(itemDir, relative);
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}
