import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, posix, relative, resolve, sep } from 'node:path';
import { compile } from '@videojs/compiler';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '@videojs/compiler/ast';
import type { ResolvedSkinItem, ResolvedSkinManifest } from '../graph/types';
import { createReactSkinSourceConfig } from '../targets/react';

export type SkinSourceFileKind = 'source' | 'style';

export interface SourceOutputFile {
  path: string;
  kind: SkinSourceFileKind;
  content: string;
}

export interface SourceOutput {
  items: Readonly<Record<string, readonly SourceOutputFile[]>>;
  dependencies: Readonly<Record<string, readonly string[]>>;
}

export interface GenerateReactRegistryOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
  iconSet?: string | undefined;
  targetRoot?: string | undefined;
  installAlias?: string | undefined;
}

interface SkinItemLayout {
  item: ResolvedSkinItem;
  itemDir: string;
  entryFile: string;
  inputFile: string;
}

interface SkinItemContext extends SkinItemLayout {
  manifest: ResolvedSkinManifest;
  layoutsByInput: ReadonlyMap<string, SkinItemLayout>;
  options: ResolvedRegistrySourceOptions;
}

interface ResolvedRegistrySourceOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
  iconSet: string;
  targetRoot: string;
}

/** Emit the editable React/Tailwind source projection consumed by the shadcn registry. */
export async function generateReactRegistry(
  manifest: ResolvedSkinManifest,
  options: GenerateReactRegistryOptions
): Promise<SourceOutput> {
  const { installAlias = '@/components/videojs', ...sourceOptions } = options;
  const resolved = resolveOptions(sourceOptions);
  const layouts = createItemLayouts(manifest, resolved);
  const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
  const selected = selectLayouts(layouts, resolved.itemNames);
  const items: Record<string, SourceOutputFile[]> = {};

  for (const layout of selected) {
    items[layout.item.name] = await emitReactItem(
      {
        ...layout,
        manifest,
        layoutsByInput,
        options: resolved,
      },
      installAlias
    );
  }

  const dependencies: Record<string, string[]> = {};
  for (const [itemName, files] of Object.entries(items)) {
    files.sort((a, b) => a.path.localeCompare(b.path));
    dependencies[itemName] = collectPackageDependencies(files);
  }
  return { items, dependencies };
}

async function createStyleResourceFiles(context: SkinItemContext): Promise<SourceOutputFile[]> {
  const files: SourceOutputFile[] = [];
  for (const resource of context.item.resources.styles ?? []) {
    const isTailwindInput = resource.endsWith('/tailwind.css');
    const inputFile = absoluteSkinPath(context.options.rootDir, resource);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(context.options.targetRoot, toPosixPath(resource));
    const content = isTailwindInput ? rewriteTailwindInput(source, inputFile) : source;
    files.push(createSourceOutputFile(target, content));
  }
  return files;
}

function createSourceOutputFile(path: string, content: string): SourceOutputFile {
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
    targetRoot: options.targetRoot ?? '',
  };
}

function createItemLayouts(manifest: ResolvedSkinManifest, options: ResolvedRegistrySourceOptions): SkinItemLayout[] {
  return manifest.items.map((item) => {
    const itemDir = item.type === 'skin' ? options.targetRoot : posix.join(options.targetRoot, 'components', item.name);
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

function collectPackageDependencies(files: readonly SourceOutputFile[]): string[] {
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
  const marker = '@import "./themes/default.css";';
  if (!source.includes(marker)) {
    throw new Error(`Tailwind source entry \`${inputFile}\` is missing the expected theme import marker.`);
  }
  return source
    .replace('@import "tailwindcss" theme(inline);', '@import "tailwindcss";')
    .replace('@theme inline {', '@theme {')
    .replace(/^@source .*;\s*$/gm, '')
    .replace(marker, `${marker}\n\n@source "../**/*.{ts,tsx,html}";`);
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

async function emitReactItem(context: SkinItemContext, installAlias: string): Promise<SourceOutputFile[]> {
  const canonical = await readFile(context.inputFile, 'utf8');
  const result = await compile(canonical, {
    filename: context.inputFile,
    config: createReactSkinSourceConfig({ style: 'tailwind', iconSet: context.options.iconSet }),
    configDir: resolve(context.options.rootDir, context.itemDir),
    outputFile: resolve(context.options.rootDir, context.entryFile),
  });
  if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    throw new Error(`Skin item \`${context.item.name}\` failed React source emission.`);
  }

  const entrySource = rewriteRelativeImports(result.code, context, installAlias);
  return [...(await createStyleResourceFiles(context)), createSourceOutputFile(context.entryFile, entrySource)];
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
