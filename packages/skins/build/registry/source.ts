import { readFile } from 'node:fs/promises';
import { basename, posix, resolve, sep } from 'node:path';
import type { ResolvedSkinCatalog, ResolvedSkinItem, SkinStyleResources } from '../catalog/types';
import { createCompilerReactConfig } from '../compiler/react';
import { emitReactModules, type ReactModuleLayout } from '../compiler/react-modules';
import { skinRootClassName } from '../compiler/skin-root';
import type { GeneratedFile } from '../output/files';
import { loadCatalogStyleManifest, type SkinStyleManifest } from '../styles/manifest';

type RegistrySourceFileKind = 'source' | 'style';

export interface RegistrySourceFile extends GeneratedFile {
  kind: RegistrySourceFileKind;
}

export interface RegistrySourceOutput {
  sharedFiles: readonly RegistrySourceFile[];
  items: Readonly<Record<string, readonly RegistrySourceFile[]>>;
  packageDependenciesByItem: Readonly<Record<string, readonly string[]>>;
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
  modules: readonly ReactModuleLayout[];
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

interface EmittedReactItem {
  files: readonly RegistrySourceFile[];
  packageDependencies: readonly string[];
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
  const packageDependenciesByItem: Record<string, string[]> = {};

  for (const layout of selected) {
    const emitted = await emitReactItem(
      {
        ...layout,
        layoutsByInput,
        options: resolved,
        styles,
      },
      installAlias
    );
    items[layout.item.name] = [...emitted.files];
    packageDependenciesByItem[layout.item.name] = [...emitted.packageDependencies];
  }
  return {
    sharedFiles: await createStyleResourceFiles(catalog.resources.styles, resolved),
    items,
    packageDependenciesByItem,
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
    const source = canonicalPath(item.source);
    const entryFile = posix.join(itemDir, sourceEntryName(item.source));
    return {
      item,
      itemDir,
      entryFile,
      inputFile: absoluteSkinPath(options.rootDir, item.source),
      modules: item.sourceFiles.map((file) => {
        const path = canonicalPath(file);
        return {
          inputFile: absoluteSkinPath(options.rootDir, file),
          outputFile: path === source ? entryFile : privateSourceOutput(itemDir, source, path),
        };
      }),
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

async function emitReactItem(context: SkinItemContext, installAlias: string): Promise<EmittedReactItem> {
  const output = await emitReactModules({
    rootDir: context.options.rootDir,
    layouts: context.modules,
    config: createCompilerReactConfig({
      style: 'tailwind',
      styles: context.styles,
      iconSet: context.options.iconSet,
      ...(context.item.type === 'skin' ? { rootClassName: skinRootClassName(context.item) } : {}),
    }),
    configDir: resolve(context.options.rootDir, context.itemDir),
    description: `Skin item \`${context.item.name}\``,
    resolveRelativeImport({ importedFile, specifier, importer }) {
      const dependency = context.layoutsByInput.get(importedFile);
      if (!dependency) {
        throw new Error(
          `Skin item \`${context.item.name}\` cannot map relative import \`${specifier}\` from \`${toPosixPath(
            importer.inputFile
          )}\`.`
        );
      }
      return `${installAlias}/${dependency.item.name}/${withoutTypeScriptExtension(posix.basename(dependency.entryFile))}`;
    },
  });
  return {
    files: output.files.map((file) => createRegistrySourceFile(file.path, file.content)),
    packageDependencies: output.dependencies,
  };
}

function privateSourceOutput(itemDir: string, entrySource: string, source: string): string {
  const relative = posix.relative(posix.dirname(entrySource), source);
  return relative.startsWith('../') ? posix.join(itemDir, 'internal', source) : posix.join(itemDir, relative);
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}
