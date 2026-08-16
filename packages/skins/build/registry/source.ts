import { readFile } from 'node:fs/promises';
import { basename, posix, resolve, sep } from 'node:path';
import { collectModuleSpecifiers } from '@videojs/compiler/ast';
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
  utilityFiles: readonly RegistrySourceFile[];
  items: Readonly<Record<string, readonly RegistrySourceFile[]>>;
  packageDependenciesByItem: Readonly<Record<string, readonly string[]>>;
  utilityDependenciesByItem: Readonly<Record<string, boolean>>;
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

interface EmittedReactItem {
  files: readonly RegistrySourceFile[];
  packageDependencies: readonly string[];
  usesUtility: boolean;
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
    variant: resolved.variant,
  });
  const items: Record<string, RegistrySourceFile[]> = {};
  const packageDependenciesByItem: Record<string, string[]> = {};
  const utilityDependenciesByItem: Record<string, boolean> = {};

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
    utilityDependenciesByItem[layout.item.name] = emitted.usesUtility;
  }
  return {
    sharedFiles: await createStyleResourceFiles(catalog.resources.styles, resolved),
    utilityFiles: await createUtilityFiles(resolved),
    items,
    packageDependenciesByItem,
    utilityDependenciesByItem,
  };
}

async function createUtilityFiles(options: ResolvedRegistrySourceOptions): Promise<RegistrySourceFile[]> {
  if (!options.utility) return [];
  const source = await readFile(absoluteSkinPath(options.rootDir, options.utility.source), 'utf8');
  return [createRegistrySourceFile(posix.join(options.sourceRoot, options.utility.target), source)];
}

async function createStyleResourceFiles(
  resources: SkinStyleResources,
  options: ResolvedRegistrySourceOptions
): Promise<RegistrySourceFile[]> {
  const files: RegistrySourceFile[] = [];
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
    variant: options.variant ?? 'default',
    iconSet: options.iconSet ?? 'default',
    sourceRoot: options.sourceRoot ?? '',
    ...(options.utility ? { utility: options.utility } : {}),
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

async function emitReactItem(context: SkinItemContext, installAlias: string): Promise<EmittedReactItem> {
  const output = await emitReactModules({
    rootDir: context.options.rootDir,
    layouts: context.modules,
    config: createCompilerReactConfig({
      style: 'tailwind',
      styles: context.styles,
      iconSet: context.options.iconSet,
      composeClassNames: Boolean(context.options.utility),
      extendComponents: Boolean(context.options.utility),
      resolveImport(reference) {
        if (reference.source === '@videojs/utils/style' && context.options.utility) {
          return { ...reference, source: context.options.utility.importSource };
        }
        if (reference.source === '@videojs/skins/registry' && context.options.utility) {
          return { ...reference, source: context.options.utility.importSource };
        }
        return reference;
      },
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
    usesUtility: context.options.utility
      ? output.files.some((file) =>
          collectModuleSpecifiers(file.content, file.path).includes(context.options.utility!.importSource)
        )
      : false,
  };
}

function privateSourceOutput(itemDir: string, entrySource: string, source: string): string {
  const relative = posix.relative(posix.dirname(entrySource), source);
  return relative.startsWith('../') ? posix.join(itemDir, 'internal', source) : posix.join(itemDir, relative);
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}
