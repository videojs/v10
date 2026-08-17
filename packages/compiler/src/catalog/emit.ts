import { readFile } from 'node:fs/promises';
import { dirname, posix, relative, resolve } from 'node:path';

import { build } from '../build';
import type { CompilerConfig } from '../config';
import { compileStyles } from '../styles/compile';
import { loadDesignSystem } from '../styles/design-system';
import { collectReferencedStyleRules, type StyleManifest } from '../styles/manifest';
import { plugin as stylesPlugin } from '../styles/plugin';
import { transform } from '../transform';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '../utils/module-specifiers';
import { toPosixPath } from '../utils/path';
import { relativeModuleSpecifier, resolveSourceModule } from '../utils/source-module';

import type { CatalogDefinition } from './define';
import { type Catalog, type CatalogItem, type CatalogResolution, resolveCatalog } from './resolve';
import { loadCatalogStyles } from './styles';

export interface CatalogOutputFile {
  readonly path: string;
  readonly content: string;
}

export interface CatalogOutputFiles {
  readonly source: readonly CatalogOutputFile[];
  readonly style: readonly CatalogOutputFile[];
}

export interface EmittedCatalogItem<File extends CatalogOutputFile = CatalogOutputFile> {
  readonly files: readonly File[];
  readonly dependencies: readonly string[];
}

export interface CatalogOutput<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly items: Readonly<Partial<Record<CatalogItem<Definition>['name'], EmittedCatalogItem>>>;
  readonly files: CatalogOutputFiles;
  readonly references: CatalogResolution<Definition>['references'];
}

export interface CatalogSourceContext<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly catalogItem: CatalogItem<Definition>;
  readonly sourceFile: string;
}

export interface CatalogStyleContext {
  readonly fileName: string;
}

export interface CatalogImportContext<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly catalogItem: CatalogItem<Definition>;
  readonly dependency: CatalogItem<Definition>;
  readonly importer: CatalogSourceContext<Definition> & { readonly outputFile: string };
  readonly importedFile: string;
  readonly specifier: string;
}

export type CatalogStyleTransform =
  | {
      readonly mode: 'tailwind';
      readonly variant?: string | undefined;
      readonly compose?: boolean | undefined;
    }
  | {
      readonly mode: 'css';
      /** Tailwind CSS entry used to resolve utilities, theme tokens, and variants. */
      readonly input: string;
      readonly scope?: string | undefined;
      readonly variant?: string | undefined;
    };

export interface CatalogTransformOptions<Definition extends CatalogDefinition = CatalogDefinition> {
  /** Preserve editable modules by default, or bundle each requested catalog entry. */
  readonly mode?: 'modules' | 'bundle' | undefined;
  readonly compiler: CompilerConfig | ((catalogItem: CatalogItem<Definition>) => CompilerConfig);
  readonly configDir?: string | ((catalogItem: CatalogItem<Definition>) => string | undefined) | undefined;
  readonly styles?: CatalogStyleTransform | undefined;
}

export interface CatalogEmitOptions<Definition extends CatalogDefinition = CatalogDefinition> {
  /** Entry items. Module emission includes their transitive catalog dependencies. */
  readonly items?: readonly CatalogItem<Definition>['name'][] | undefined;
  readonly transform: CatalogTransformOptions<Definition>;
  readonly files: {
    source(context: CatalogSourceContext<Definition>): string;
    style?(context: CatalogStyleContext): string;
  };
  readonly resolve?: {
    readonly imports?: {
      dependency?(context: CatalogImportContext<Definition>): string | undefined;
    };
  };
}

interface CatalogLayout<Definition extends CatalogDefinition> extends CatalogSourceContext<Definition> {
  inputFile: string;
  outputFile: string;
}

interface LoadedCatalogStyles {
  manifest: StyleManifest;
  files: CatalogOutputFile[];
}

interface EmittedCatalogSources<Definition extends CatalogDefinition> {
  items: CatalogOutput<Definition>['items'];
  styles: CatalogOutputFile[];
}

/** Resolve, transform, and emit source and style files for requested catalog entries. */
export async function emitCatalog<const Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  options: CatalogEmitOptions<Definition>
): Promise<CatalogOutput<Definition>> {
  const requestedNames = options.items ?? catalog.items.map((catalogItem) => catalogItem.name);
  const requested = requestedCatalogItems(catalog, requestedNames);
  const resolved = resolveCatalog(catalog, requestedNames);

  const styles = options.transform.styles
    ? await loadStyles(catalog, resolved.items, options.transform.styles, options)
    : undefined;

  const emitted =
    options.transform.mode === 'bundle'
      ? await emitBundles(catalog, requested, options, styles?.manifest)
      : await emitModules(catalog, resolved.items, options, styles?.manifest);

  const emittedItems = emitted.items as Readonly<Record<string, EmittedCatalogItem | undefined>>;

  const source = Object.values(emittedItems)
    .flatMap((item) => item?.files ?? [])
    .sort((a, b) => a.path.localeCompare(b.path));

  const style = uniqueStyleFiles([...(styles?.files ?? []), ...emitted.styles]);

  assertUniqueFiles(source, 'source');

  return {
    items: emitted.items,
    files: {
      source,
      style,
    },
    references: resolved.references,
  };
}

async function emitModules<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  catalogItems: readonly CatalogItem<Definition>[],
  options: CatalogEmitOptions<Definition>,
  styles: StyleManifest | undefined
): Promise<EmittedCatalogSources<Definition>> {
  const layoutsByItem = new Map(
    catalogItems.map((catalogItem) => [catalogItem.name, createLayouts(catalog, catalogItem, options)] as const)
  );
  const entriesByInput = new Map(
    catalog.items.map((catalogItem) => [resolve(catalog.rootDir, catalogItem.source), catalogItem] as const)
  );
  const output: Record<string, EmittedCatalogItem> = {};
  const assets: CatalogOutputFile[] = [];

  for (const catalogItem of catalogItems) {
    const layouts = layoutsByItem.get(catalogItem.name)!;
    const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
    const files: CatalogOutputFile[] = [];
    const config = compilerConfig(options.transform.compiler, catalogItem, styles, options.transform.styles);
    const configDir = compilerConfigDir(options.transform.configDir, catalogItem) ?? catalog.rootDir;

    for (const layout of layouts) {
      const source = await readFile(layout.inputFile, 'utf8');
      const result = await transform(source, {
        filename: layout.inputFile,
        outputFile: resolve(catalog.rootDir, layout.outputFile),
        config,
        configDir,
      });

      if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
        throw new Error(`Catalog item \`${catalogItem.name}\` module \`${layout.sourceFile}\` failed to transform.`);
      }

      assets.push(
        ...result.assets.map((asset) => ({
          path: styleOutputPath(asset.fileName, options),
          content: asset.source,
        }))
      );

      files.push({
        path: layout.outputFile,
        content: rewriteRelativeImports(result.code, layout, layoutsByInput, layoutsByItem, entriesByInput, options),
      });
    }

    output[catalogItem.name] = {
      files,
      dependencies: collectPackageDependencies(files),
    };
  }

  return {
    items: output as CatalogOutput<Definition>['items'],
    styles: uniqueStyleFiles(assets),
  };
}

async function emitBundles<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  catalogItems: readonly CatalogItem<Definition>[],
  options: CatalogEmitOptions<Definition>,
  styles: StyleManifest | undefined
): Promise<EmittedCatalogSources<Definition>> {
  const output: Record<string, EmittedCatalogItem> = {};
  const assets: CatalogOutputFile[] = [];

  for (const catalogItem of catalogItems) {
    const outputFile = toPosixPath(options.files.source({ catalogItem, sourceFile: catalogItem.source }));
    const configDir = compilerConfigDir(options.transform.configDir, catalogItem) ?? catalog.rootDir;
    const config = compilerConfig(options.transform.compiler, catalogItem, styles, options.transform.styles);
    const result = await build(
      {
        ...config,
        input: resolve(catalog.rootDir, catalogItem.source),
        output: {
          ...config.output,
          file: resolve(catalog.rootDir, outputFile),
        },
      },
      { configDir }
    );

    if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
      throw new Error(`Catalog item \`${catalogItem.name}\` failed to bundle.`);
    }

    const chunks = result.files.filter((file) => file.type === 'chunk');

    if (chunks.length !== 1 || !chunks[0]) {
      throw new Error(
        `Catalog item \`${catalogItem.name}\` bundle expected one output chunk, but received ${chunks.length}.`
      );
    }

    const files = [{ path: outputFile, content: chunks[0].source }];
    const outputDir = dirname(resolve(catalog.rootDir, outputFile));

    assets.push(
      ...result.files
        .filter((file) => file.type === 'asset')
        .map((asset) => ({
          path: styleOutputPath(toPosixPath(relative(outputDir, asset.fileName)), options),
          content: asset.source,
        }))
    );

    output[catalogItem.name] = {
      files,
      dependencies: collectPackageDependencies(files),
    };
  }

  return {
    items: output as CatalogOutput<Definition>['items'],
    styles: uniqueStyleFiles(assets),
  };
}

async function loadStyles<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  catalogItems: readonly CatalogItem<Definition>[],
  styles: CatalogStyleTransform,
  options: CatalogEmitOptions<Definition>
): Promise<LoadedCatalogStyles> {
  const itemNames = catalogItems.map((catalogItem) => catalogItem.name);
  const manifest = await loadCatalogStyles(catalog, itemNames);

  if (styles.mode === 'tailwind') return { manifest, files: [] };

  const ruleClassNames = await collectReferencedStyleRules(
    catalogItems.flatMap((catalogItem) => catalogItem.files.source.map((file) => resolve(catalog.rootDir, file))),
    manifest
  );
  const compiled = await compileStyles({
    design: await loadDesignSystem(resolve(catalog.rootDir, styles.input)),
    manifest,
    ruleClassNames,
    ...(styles.scope ? { scope: styles.scope } : {}),
    ...(styles.variant ? { variant: styles.variant } : {}),
  });
  const files = [...compiled]
    .map(([fileName, content]) => ({
      path: styleOutputPath(fileName, options),
      content,
    }))
    .sort((a, b) => a.path.localeCompare(b.path));

  assertUniqueFiles(files, 'style');

  return { manifest, files };
}

function compilerConfig<Definition extends CatalogDefinition>(
  compiler: CatalogTransformOptions<Definition>['compiler'],
  catalogItem: CatalogItem<Definition>,
  manifest: StyleManifest | undefined,
  styles: CatalogStyleTransform | undefined
): CompilerConfig {
  const config = typeof compiler === 'function' ? compiler(catalogItem) : compiler;

  if (!manifest || !styles) return config;

  const styleOptions =
    styles.mode === 'tailwind'
      ? {
          mode: 'tailwind' as const,
          manifest,
          ...(styles.variant ? { variant: styles.variant } : {}),
          ...(styles.compose ? { compose: true } : {}),
        }
      : {
          mode: 'css' as const,
          manifest,
          ...(styles.variant ? { variant: styles.variant } : {}),
        };

  return {
    ...config,
    plugins: [stylesPlugin(styleOptions), ...(config.plugins ?? [])],
  };
}

function compilerConfigDir<Definition extends CatalogDefinition>(
  configDir: CatalogTransformOptions<Definition>['configDir'],
  catalogItem: CatalogItem<Definition>
): string | undefined {
  return typeof configDir === 'function' ? configDir(catalogItem) : configDir;
}

function requestedCatalogItems<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  itemNames: readonly CatalogItem<Definition>['name'][]
): CatalogItem<Definition>[] {
  const itemsByName = new Map(catalog.items.map((catalogItem) => [catalogItem.name, catalogItem]));

  return [...new Set(itemNames)].sort().map((name) => itemsByName.get(name) ?? missingItem(name));
}

function createLayouts<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  catalogItem: CatalogItem<Definition>,
  options: CatalogEmitOptions<Definition>
): CatalogLayout<Definition>[] {
  const outputs = new Set<string>();

  return catalogItem.files.source
    .map((sourceFile) => {
      const outputFile = toPosixPath(options.files.source({ catalogItem, sourceFile }));

      if (outputs.has(outputFile)) {
        throw new Error(`Catalog item \`${catalogItem.name}\` output collision: \`${outputFile}\`.`);
      }

      outputs.add(outputFile);

      return {
        catalogItem,
        sourceFile,
        inputFile: resolve(catalog.rootDir, sourceFile),
        outputFile,
      };
    })
    .sort((a, b) => a.outputFile.localeCompare(b.outputFile));
}

function rewriteRelativeImports<Definition extends CatalogDefinition>(
  source: string,
  importer: CatalogLayout<Definition>,
  layoutsByInput: ReadonlyMap<string, CatalogLayout<Definition>>,
  layoutsByItem: ReadonlyMap<string, readonly CatalogLayout<Definition>[]>,
  entriesByInput: ReadonlyMap<string, CatalogItem<Definition>>,
  options: CatalogEmitOptions<Definition>
): string {
  return rewriteModuleSpecifiers(source, {
    filename: importer.outputFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;

      const importedFile = resolveSourceModule(importer.inputFile, specifier);

      if (!importedFile) {
        throw new Error(
          `Catalog item \`${importer.catalogItem.name}\` cannot resolve \`${specifier}\` from \`${importer.sourceFile}\`.`
        );
      }

      const local = layoutsByInput.get(importedFile);

      if (local) return relativeModuleSpecifier(posix.dirname(importer.outputFile), local.outputFile);

      const dependency = entriesByInput.get(importedFile);

      if (!dependency) {
        throw new Error(
          `Catalog item \`${importer.catalogItem.name}\` cannot map \`${specifier}\` from \`${importer.sourceFile}\`.`
        );
      }

      const dependencyEntry = layoutsByItem.get(dependency.name)?.find((layout) => layout.inputFile === importedFile);

      if (!dependencyEntry) throw new Error(`Catalog output is missing item \`${dependency.name}\`.`);

      const replacement = options.resolve?.imports?.dependency?.({
        catalogItem: importer.catalogItem,
        dependency,
        importer,
        importedFile,
        specifier,
      });

      return replacement ?? relativeModuleSpecifier(posix.dirname(importer.outputFile), dependencyEntry.outputFile);
    },
  });
}

function collectPackageDependencies(files: readonly CatalogOutputFile[]): string[] {
  const packages = new Set<string>();

  for (const file of files) {
    for (const specifier of collectModuleSpecifiers(file.content, file.path)) {
      if (isPackageSpecifier(specifier)) packages.add(packageName(specifier));
    }
  }

  return [...packages].sort();
}

function assertUniqueFiles(files: readonly CatalogOutputFile[], kind: 'source' | 'style'): void {
  const paths = new Set<string>();

  for (const file of files) {
    if (paths.has(file.path)) throw new Error(`Catalog ${kind} output collision: \`${file.path}\`.`);
    paths.add(file.path);
  }
}

function uniqueStyleFiles(files: readonly CatalogOutputFile[]): CatalogOutputFile[] {
  const unique = new Map<string, CatalogOutputFile>();

  for (const file of files) {
    const previous = unique.get(file.path);

    if (previous?.content !== undefined && previous.content !== file.content) {
      throw new Error(`Catalog style output collision: \`${file.path}\`.`);
    }

    unique.set(file.path, file);
  }

  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function styleOutputPath<Definition extends CatalogDefinition>(
  fileName: string,
  options: CatalogEmitOptions<Definition>
): string {
  return toPosixPath(options.files.style?.({ fileName }) ?? fileName);
}

function packageName(specifier: string): string {
  if (!specifier.startsWith('@')) return specifier.split('/')[0] ?? specifier;

  return specifier.split('/').slice(0, 2).join('/');
}

function isPackageSpecifier(specifier: string): boolean {
  return Boolean(specifier) && !specifier.startsWith('.') && !specifier.startsWith('@/') && !specifier.startsWith('~/');
}

function missingItem(name: string): never {
  throw new Error(`Catalog output references missing item \`${name}\`.`);
}
