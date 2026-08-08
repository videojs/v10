import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { basename, dirname, extname, posix, resolve, sep } from 'node:path';
import { collectModuleSpecifiers } from '@videojs/compiler/ast';
import type { RegistryFramework, ResolvedRegistry, ResolvedRegistryItem } from './types';

export type RegistryStyle = 'css' | 'tailwind';
export type RegistryFileKind = 'source' | 'style';

export interface RegistryVariant {
  framework: RegistryFramework;
  style: RegistryStyle;
}

export interface RegistryOutputFile {
  path: string;
  kind: RegistryFileKind;
  content: string;
}

export interface RegistryOutput {
  items: Readonly<Record<string, readonly RegistryOutputFile[]>>;
  dependencies: Readonly<Record<string, readonly string[]>>;
}

export interface GenerateRegistryOptions {
  rootDir: string;
  style: RegistryStyle;
  itemNames?: readonly string[] | undefined;
  iconSet?: string | undefined;
  targetRoot?: string | undefined;
}

export interface ResolvedGenerateRegistryOptions {
  framework: RegistryFramework;
  style: RegistryStyle;
  rootDir: string;
  itemNames?: readonly string[] | undefined;
  iconSet: string;
  targetRoot: string;
}

export interface RegistryItemLayout {
  item: ResolvedRegistryItem;
  itemDir: string;
  entryFile: string;
  inputFile: string;
  tailwindInput: string;
}

export interface RegistryItemContext extends RegistryItemLayout {
  registry: ResolvedRegistry;
  layoutsByInput: ReadonlyMap<string, RegistryItemLayout>;
  options: ResolvedGenerateRegistryOptions;
}

export interface RegistryEmitter {
  framework: RegistryFramework;
  outputEntryName(source: string): string;
  emitItem(context: RegistryItemContext): Promise<RegistryOutputFile[]>;
  finish?(items: Record<string, RegistryOutputFile[]>, options: ResolvedGenerateRegistryOptions): void | Promise<void>;
}

/** Generate one framework and style variant from the resolved Skin registry. */
export async function generateRegistry(
  registry: ResolvedRegistry,
  options: GenerateRegistryOptions,
  emitter: RegistryEmitter
): Promise<RegistryOutput> {
  const resolved = resolveOptions(options, emitter.framework);
  const layouts = createItemLayouts(registry, resolved, emitter.outputEntryName);
  const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
  const selected = selectLayouts(layouts, resolved.itemNames);
  const items: Record<string, RegistryOutputFile[]> = {};

  for (const layout of selected) {
    items[layout.item.name] = await emitter.emitItem({
      ...layout,
      registry,
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

export async function createStyleResourceFiles(context: RegistryItemContext): Promise<RegistryOutputFile[]> {
  const files: RegistryOutputFile[] = [];
  for (const resource of context.item.resources.styles ?? []) {
    const isTailwindInput = resource.endsWith('/tailwind.css');
    if (isTailwindInput && context.options.style === 'css') continue;

    const inputFile = absoluteRegistryPath(context.options.rootDir, resource);
    const source = await readFile(inputFile, 'utf8');
    const target = posix.join(context.options.targetRoot, stripCanonicalPrefix(toPosixPath(resource)));
    const content = isTailwindInput ? rewriteTailwindInput(source, inputFile) : source;
    files.push(createRegistryOutputFile(target, content));
  }
  return files;
}

export function createExtractedStyleFile(
  context: RegistryItemContext,
  css: string,
  options: { support?: boolean | undefined } = {}
): RegistryOutputFile {
  const target = posix.join(context.itemDir, 'styles.css');
  const stylesDir = posix.join(context.options.targetRoot, 'styles');
  const relativeStylesDir = relativeModulePath(posix.dirname(target), stylesDir);
  const content = [
    `@import '${relativeStylesDir}/base.css';`,
    `@import '${relativeStylesDir}/themes/default.css';`,
    ...(options.support ? [`@import '${relativeStylesDir}/support.css';`] : []),
    '',
    css.trim(),
    '',
  ].join('\n');
  return createRegistryOutputFile(target, content);
}

export function createRegistryOutputFile(path: string, content: string): RegistryOutputFile {
  return {
    path,
    kind: path.endsWith('.css') ? 'style' : 'source',
    content,
  };
}

export function sourceEntryName(source: string, framework: RegistryFramework): string {
  const base = basename(source).replace(/\.skin(?=\.[^.]+$)/, '');
  return framework === 'html' ? base.replace(/\.[^.]+$/, '.html') : base;
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

export function relativeModulePath(from: string, to: string): string {
  const path = posix.relative(toPosixPath(from), toPosixPath(to));
  return path.startsWith('.') ? path : `./${path}`;
}

export function withoutTypeScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?ts|tsx)$/, '');
}

export function toPosixPath(path: string): string {
  return path.split(sep).join('/');
}

function resolveOptions(
  options: GenerateRegistryOptions,
  framework: RegistryFramework
): ResolvedGenerateRegistryOptions {
  return {
    framework,
    style: options.style,
    rootDir: resolve(options.rootDir),
    ...(options.itemNames ? { itemNames: options.itemNames } : {}),
    iconSet: options.iconSet ?? 'default',
    targetRoot: options.targetRoot ?? '',
  };
}

function createItemLayouts(
  registry: ResolvedRegistry,
  options: ResolvedGenerateRegistryOptions,
  outputEntryName: RegistryEmitter['outputEntryName']
): RegistryItemLayout[] {
  return registry.items.map((item) => {
    const itemDir = item.type === 'skin' ? options.targetRoot : posix.join(options.targetRoot, 'components', item.name);
    return {
      item,
      itemDir,
      entryFile: posix.join(itemDir, outputEntryName(item.source)),
      inputFile: absoluteRegistryPath(options.rootDir, item.source),
      tailwindInput: tailwindResource(item, options.rootDir),
    };
  });
}

function selectLayouts(
  layouts: readonly RegistryItemLayout[],
  itemNames: readonly string[] | undefined
): RegistryItemLayout[] {
  const byName = new Map(layouts.map((layout) => [layout.item.name, layout]));
  const selected = itemNames ?? [...byName.keys()];
  return [...selected].sort().map((name) => byName.get(name) ?? missingItem(name));
}

function missingItem(name: string): never {
  throw new Error(`Registry generation references missing item \`${name}\`.`);
}

function collectPackageDependencies(files: readonly RegistryOutputFile[]): string[] {
  const packages = new Set<string>();
  for (const file of files) {
    if (file.kind === 'style' || !/\.[cm]?[jt]sx?$/.test(file.path)) continue;
    for (const specifier of collectModuleSpecifiers(file.content, file.path)) {
      if (specifier && !specifier.startsWith('.')) packages.add(packageName(specifier));
    }
  }
  return [...packages].sort();
}

function tailwindResource(item: ResolvedRegistryItem, rootDir: string): string {
  const resource = item.resources.styles?.find((path) => path.endsWith('/tailwind.css'));
  if (!resource) throw new Error(`Registry item \`${item.name}\` has no Tailwind style resource.`);
  return absoluteRegistryPath(rootDir, resource);
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

function absoluteRegistryPath(rootDir: string, path: string): string {
  return resolve(rootDir, path);
}

function packageName(specifier: string): string {
  if (!specifier.startsWith('@')) return specifier.split('/')[0] ?? specifier;
  return specifier.split('/').slice(0, 2).join('/');
}
