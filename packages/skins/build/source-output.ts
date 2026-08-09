import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, posix, resolve, sep } from 'node:path';
import { collectModuleSpecifiers } from '@videojs/compiler/ast';
import type { ResolvedSkinItem, ResolvedSkinManifest } from './types';

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

export interface GenerateSourceOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
  iconSet?: string | undefined;
  targetRoot?: string | undefined;
}

export interface ResolvedGenerateSourceOptions {
  rootDir: string;
  itemNames?: readonly string[] | undefined;
  iconSet: string;
  targetRoot: string;
}

export interface SkinItemLayout {
  item: ResolvedSkinItem;
  itemDir: string;
  entryFile: string;
  inputFile: string;
  tailwindInput: string;
}

export interface SkinItemContext extends SkinItemLayout {
  manifest: ResolvedSkinManifest;
  layoutsByInput: ReadonlyMap<string, SkinItemLayout>;
  options: ResolvedGenerateSourceOptions;
}

export interface SourceEmitter {
  outputEntryName(source: string): string;
  emitItem(context: SkinItemContext): Promise<SourceOutputFile[]>;
  finish?(items: Record<string, SourceOutputFile[]>, options: ResolvedGenerateSourceOptions): void | Promise<void>;
}

/** Generate editable source items from the resolved Skin manifest. */
export async function generateSource(
  manifest: ResolvedSkinManifest,
  options: GenerateSourceOptions,
  emitter: SourceEmitter
): Promise<SourceOutput> {
  const resolved = resolveOptions(options);
  const layouts = createItemLayouts(manifest, resolved, emitter.outputEntryName);
  const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
  const selected = selectLayouts(layouts, resolved.itemNames);
  const items: Record<string, SourceOutputFile[]> = {};

  for (const layout of selected) {
    items[layout.item.name] = await emitter.emitItem({
      ...layout,
      manifest,
      layoutsByInput,
      options: resolved,
    });
  }

  await emitter.finish?.(items, resolved);

  const dependencies: Record<string, string[]> = {};
  for (const [itemName, files] of Object.entries(items)) {
    files.sort((a, b) => a.path.localeCompare(b.path));
    dependencies[itemName] = collectPackageDependencies(files);
  }
  return { items, dependencies };
}

export async function createStyleResourceFiles(context: SkinItemContext): Promise<SourceOutputFile[]> {
  const files: SourceOutputFile[] = [];
  for (const resource of context.item.resources.styles ?? []) {
    const isTailwindInput = resource.endsWith('/tailwind.css');
    const inputFile = absoluteSkinPath(context.options.rootDir, resource);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(context.options.targetRoot, stripCanonicalPrefix(toPosixPath(resource)));
    const content = isTailwindInput ? rewriteTailwindInput(source, inputFile) : source;
    files.push(createSourceOutputFile(target, content));
  }
  return files;
}

export function createSourceOutputFile(path: string, content: string): SourceOutputFile {
  return {
    path,
    kind: path.endsWith('.css') ? 'style' : 'source',
    content,
  };
}

export function sourceEntryName(source: string): string {
  return basename(source).replace(/\.skin(?=\.[^.]+$)/, '');
}

export function resolveSourceFile(inputFile: string, specifier: string): string {
  const candidate = resolve(dirname(inputFile), specifier);
  if (['.ts', '.tsx', '.mts', '.cts'].includes(extname(candidate))) return candidate;
  for (const extension of ['.ts', '.tsx', '.mts', '.cts']) {
    const fileName = `${candidate}${extension}`;
    if (existsSync(fileName)) return fileName;
  }
  return candidate;
}

export function withoutTypeScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?ts|tsx)$/, '');
}

export function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}

function resolveOptions(options: GenerateSourceOptions): ResolvedGenerateSourceOptions {
  return {
    rootDir: resolve(options.rootDir),
    ...(options.itemNames ? { itemNames: options.itemNames } : {}),
    iconSet: options.iconSet ?? 'default',
    targetRoot: options.targetRoot ?? '',
  };
}

function createItemLayouts(
  manifest: ResolvedSkinManifest,
  options: ResolvedGenerateSourceOptions,
  outputEntryName: SourceEmitter['outputEntryName']
): SkinItemLayout[] {
  return manifest.items.map((item) => {
    const itemDir = item.type === 'skin' ? options.targetRoot : posix.join(options.targetRoot, 'components', item.name);
    return {
      item,
      itemDir,
      entryFile: posix.join(itemDir, outputEntryName(item.source)),
      inputFile: absoluteSkinPath(options.rootDir, item.source),
      tailwindInput: tailwindResource(item, options.rootDir),
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

function tailwindResource(item: ResolvedSkinItem, rootDir: string): string {
  const resource = item.resources.styles?.find((path) => path.endsWith('/tailwind.css'));
  if (!resource) throw new Error(`Skin item \`${item.name}\` has no Tailwind style resource.`);
  return absoluteSkinPath(rootDir, resource);
}

function rewriteTailwindInput(source: string, inputFile: string): string {
  const marker = '@import "./themes/default.css";';
  if (!source.includes(marker)) {
    throw new Error(`Tailwind source entry \`${inputFile}\` is missing the expected theme import marker.`);
  }
  return source.replace(/^@source .*;\s*$/gm, '').replace(marker, `${marker}\n\n@source "../**/*.{ts,tsx,html}";`);
}

function stripCanonicalPrefix(path: string): string {
  return path.replace(/^\.\/canonical\//, '');
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
