import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, posix, relative, resolve, sep } from 'node:path';
import { transform } from '@videojs/compiler';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '@videojs/compiler/ast';
import type { ResolvedSkinCatalog, ResolvedSkinItem, SkinStyleResources } from '../catalog/types';
import { createCompilerReactConfig } from '../compiler/react';
import type { GeneratedFile } from '../output/files';
import { loadCatalogStyleManifest, type SkinStyleManifest } from '../styles/manifest';

type RegistrySourceFileKind = 'source' | 'style';

export interface RegistrySourceFile extends GeneratedFile {
  kind: RegistrySourceFileKind;
}

export interface RegistrySourceOutput {
  sharedFiles: readonly RegistrySourceFile[];
  items: Readonly<Record<string, readonly RegistrySourceFile[]>>;
  dependencies: Readonly<Record<string, readonly string[]>>;
}

interface GenerateReactRegistryOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
  iconSet?: string | undefined;
  sourceRoot?: string | undefined;
  installAlias?: string | undefined;
}

interface SkinItemLayout {
  item: ResolvedSkinItem;
  itemDir: string;
  entryFile: string;
  inputFile: string;
}

interface SkinItemContext extends SkinItemLayout {
  layoutsByInput: ReadonlyMap<string, SkinItemLayout>;
  options: ResolvedRegistrySourceOptions;
  styles: SkinStyleManifest;
}

interface ResolvedRegistrySourceOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
  iconSet: string;
  sourceRoot: string;
}

/** Emit the editable React/Tailwind source projection consumed by the shadcn registry. */
export async function generateReactRegistry(
  catalog: ResolvedSkinCatalog,
  options: GenerateReactRegistryOptions
): Promise<RegistrySourceOutput> {
  const { installAlias = '@/components/videojs', ...sourceOptions } = options;
  const resolved = resolveOptions(sourceOptions);
  const layouts = createItemLayouts(catalog, resolved);
  const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
  const selected = selectLayouts(layouts, resolved.itemNames);
  const styles = await loadCatalogStyleManifest(catalog, {
    rootDir: resolved.rootDir,
    itemNames: selected.map((layout) => layout.item.name),
  });
  const items: Record<string, RegistrySourceFile[]> = {};

  for (const layout of selected) {
    items[layout.item.name] = await emitReactItem(
      {
        ...layout,
        layoutsByInput,
        options: resolved,
        styles,
      },
      installAlias
    );
  }

  const dependencies: Record<string, string[]> = {};
  for (const [itemName, files] of Object.entries(items)) {
    files.sort((a, b) => a.path.localeCompare(b.path));
    dependencies[itemName] = collectPackageDependencies(files);
  }
  return {
    sharedFiles: await createStyleResourceFiles(catalog.resources.styles, resolved),
    items,
    dependencies,
  };
}

async function createStyleResourceFiles(
  resources: SkinStyleResources,
  options: ResolvedRegistrySourceOptions
): Promise<RegistrySourceFile[]> {
  const files: RegistrySourceFile[] = [];
  const entries = [
    { path: resources.tailwind, transform: rewriteTailwindInput },
    { path: resources.base },
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

function createRegistrySourceFile(path: string, content: string): RegistrySourceFile {
  return {
    path,
    kind: path.endsWith('.css') ? 'style' : 'source',
    content,
  };
}

function sourceEntryName(source: string): string {
  return basename(source);
}

function resolveSourceFile(inputFile: string, specifier: string): string {
  const candidate = resolve(dirname(inputFile), specifier);
  if (['.ts', '.tsx', '.mts', '.cts'].includes(extname(candidate))) return candidate;
  for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
    const fileName = `${candidate}${extension}`;
    if (existsSync(fileName)) return fileName;
  }
  return candidate;
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
    iconSet: options.iconSet ?? 'default',
    sourceRoot: options.sourceRoot ?? '',
  };
}

function createItemLayouts(catalog: ResolvedSkinCatalog, options: ResolvedRegistrySourceOptions): SkinItemLayout[] {
  return catalog.items.map((item) => {
    const itemDir = item.type === 'skin' ? options.sourceRoot : posix.join(options.sourceRoot, 'components', item.name);
    return {
      item,
      itemDir,
      entryFile: posix.join(itemDir, sourceEntryName(item.source)),
      inputFile: absoluteSkinPath(options.rootDir, item.source),
    };
  });
}

function selectLayouts(layouts: readonly SkinItemLayout[], itemNames: readonly string[] | undefined): SkinItemLayout[] {
  const byName = new Map(layouts.map((layout) => [layout.item.name, layout]));
  const selected = itemNames ?? [...byName.keys()];
  return [...selected].sort().map((name) => byName.get(name) ?? missingItem(name));
}

function missingItem(name: string): never {
  throw new Error(`Skin generation references missing item \`${name}\`.`);
}

function collectPackageDependencies(files: readonly RegistrySourceFile[]): string[] {
  const packages = new Set<string>();
  for (const file of files) {
    if (file.kind === 'style' || !/\.[cm]?[jt]sx?$/.test(file.path)) continue;
    for (const specifier of collectModuleSpecifiers(file.content, file.path)) {
      if (isPackageSpecifier(specifier)) packages.add(packageName(specifier));
    }
  }
  return [...packages].sort();
}

function rewriteTailwindInput(source: string, inputFile: string): string {
  // Tailwind directives are outside Lightning CSS's typed AST. Rewrite only
  // anchored top-level directive headers and require each semantic marker once.
  let output = replaceDirective(
    source,
    /^@import\s+(["'])tailwindcss\1\s+theme\(inline\)\s*;\s*$/m,
    '@import "tailwindcss";',
    inputFile,
    'inline Tailwind import'
  );
  output = replaceDirective(output, /^@theme\s+inline\s*\{/m, '@theme {', inputFile, 'inline theme block');
  output = output.replace(/^@source\s+.+;\s*$/gm, '').trim();
  const importBlock = output.match(/^(?:@import[^\n]+;\s*)+/)?.[0];
  if (!importBlock) throw new Error(`Tailwind source entry \`${inputFile}\` must begin with imports.`);
  return `${importBlock.trim()}\n\n@source "../**/*.{ts,tsx,html}";\n\n${output.slice(importBlock.length).trimStart()}\n`;
}

function replaceDirective(
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

function packageName(specifier: string): string {
  if (!specifier.startsWith('@')) return specifier.split('/')[0] ?? specifier;
  return specifier.split('/').slice(0, 2).join('/');
}

function isPackageSpecifier(specifier: string): boolean {
  return Boolean(specifier) && !specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith('~/');
}

async function emitReactItem(context: SkinItemContext, installAlias: string): Promise<RegistrySourceFile[]> {
  const canonical = await readFile(context.inputFile, 'utf8');
  const result = await transform(canonical, {
    filename: context.inputFile,
    config: createCompilerReactConfig({
      style: 'tailwind',
      styles: context.styles,
      iconSet: context.options.iconSet,
    }),
    configDir: resolve(context.options.rootDir, context.itemDir),
    outputFile: resolve(context.options.rootDir, context.entryFile),
  });
  if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    throw new Error(`Skin item \`${context.item.name}\` failed React source emission.`);
  }

  const entrySource = rewriteRelativeImports(result.code, context, installAlias);
  return [createRegistrySourceFile(context.entryFile, entrySource)];
}

function rewriteRelativeImports(source: string, context: SkinItemContext, installAlias: string): string {
  return rewriteModuleSpecifiers(source, {
    filename: context.entryFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;
      const importedFile = resolveSourceFile(context.inputFile, specifier);
      const dependency = context.layoutsByInput.get(importedFile);
      if (!existsSync(importedFile)) {
        throw new Error(
          `Skin item \`${context.item.name}\` has unresolved relative import \`${specifier}\` from \`${toPosixPath(
            relative(context.options.rootDir, context.inputFile)
          )}\`.`
        );
      }
      if (!dependency) {
        throw new Error(
          `Skin item \`${context.item.name}\` cannot map relative import \`${specifier}\` from \`${toPosixPath(
            relative(context.options.rootDir, context.inputFile)
          )}\`.`
        );
      }
      return `${installAlias}/${dependency.item.name}/${withoutTypeScriptExtension(posix.basename(dependency.entryFile))}`;
    },
  });
}
