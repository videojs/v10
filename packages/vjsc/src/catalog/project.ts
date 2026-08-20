import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

import type { CompilerConfig } from '../config';
import { type ComponentRegistry, plugin as registryPlugin } from '../registry';
import { compileStyles } from '../styles/compile';
import { loadDesignSystem } from '../styles/design-system';
import { collectReferencedStyleRules, type StyleManifest } from '../styles/manifest';
import { plugin as stylesPlugin } from '../styles/plugin';
import { transform } from '../transform';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '../utils/module-specifiers';
import { toPosixPath } from '../utils/path';
import { relativeModuleSpecifier, resolveSourceModule } from '../utils/source-module';

import type { CatalogDefinition } from './define';
import { catalogMetaPlugin } from './meta';
import { type Catalog, type CatalogItem, type CatalogResolution, resolveCatalog } from './resolve';
import { loadCatalogStyles } from './styles';

export interface CatalogOutputFile {
  readonly path: string;
  readonly content: string;
  /** Exact non-relative module specifiers retained by this output file. */
  readonly imports?: readonly string[] | undefined;
}

export interface CatalogOutputFiles {
  readonly source: readonly CatalogOutputFile[];
  readonly style: readonly CatalogOutputFile[];
}

export interface ProjectedCatalogItem<File extends CatalogOutputFile = CatalogOutputFile> {
  readonly files: readonly File[];
  /** Exact non-relative module specifiers retained by every projected file. */
  readonly imports: readonly string[];
  /** Package names derived from `imports`. */
  readonly dependencies: readonly string[];
}

export interface CatalogProjectionResult<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly items: Readonly<Partial<Record<CatalogItem<Definition>['name'], ProjectedCatalogItem>>>;
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
    }
  | {
      readonly mode: 'css';
      /** Tailwind CSS entry used to resolve utilities, theme tokens, and variants. */
      readonly input: string;
      readonly scope?: string | undefined;
      readonly variant?: string | undefined;
    };

export interface CatalogProjection<Definition extends CatalogDefinition = CatalogDefinition> {
  /** Framework mappings used to lower VJSC components. */
  readonly componentRegistry?: ComponentRegistry | undefined;
  readonly transform?: CompilerConfig | ((catalogItem: CatalogItem<Definition>) => CompilerConfig) | undefined;
  readonly cwd?: string | ((catalogItem: CatalogItem<Definition>) => string | undefined) | undefined;
}

interface StaticCatalogProjection<Definition extends CatalogDefinition = CatalogDefinition>
  extends CatalogProjection<Definition> {
  readonly transform: CompilerConfig;
}

export interface CatalogProjectionOptions<Definition extends CatalogDefinition = CatalogDefinition> {
  /** Entry items. Projection includes their transitive catalog dependencies. */
  readonly items?: readonly CatalogItem<Definition>['name'][] | undefined;
  readonly projection: CatalogProjection<Definition>;
  readonly styles?: CatalogStyleTransform | undefined;
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

/** Define a reusable editable-source projection while preserving its inferred configuration. */
export function defineCatalogProjection<const Adapter extends StaticCatalogProjection>(adapter: Adapter): Adapter;
export function defineCatalogProjection<const Definition extends CatalogDefinition>(
  adapter: CatalogProjection<Definition>
): CatalogProjection<Definition>;
export function defineCatalogProjection(adapter: CatalogProjection<any>): CatalogProjection<any> {
  return adapter;
}

/** Resolve the transform configuration contributed by a catalog projection. */
export function resolveCatalogTransformConfig<Definition extends CatalogDefinition>(
  projection: CatalogProjection<Definition>,
  catalogItem?: CatalogItem<Definition>
): CompilerConfig {
  const configured = projection.transform;
  const config =
    typeof configured === 'function'
      ? catalogItem
        ? configured(catalogItem)
        : missingProjectionItem()
      : (configured ?? {});
  const plugins = [
    ...(projection.componentRegistry ? [registryPlugin(projection.componentRegistry)] : []),
    ...(config.plugins ?? []),
  ];

  return {
    ...config,
    ...(plugins.length > 0 ? { plugins } : {}),
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

interface ProjectedCatalogSources<Definition extends CatalogDefinition> {
  items: CatalogProjectionResult<Definition>['items'];
  styles: CatalogOutputFile[];
}

/** Resolve and transform editable source and style files for requested catalog entries. */
export async function projectCatalog<const Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  options: CatalogProjectionOptions<Definition>
): Promise<CatalogProjectionResult<Definition>> {
  const requestedNames = options.items ?? catalog.items.map((catalogItem) => catalogItem.name);
  const resolved = resolveCatalog(catalog, requestedNames);

  const styles = options.styles ? await loadStyles(catalog, resolved.items, options.styles, options) : undefined;

  const projected = await projectModules(catalog, resolved.items, options, styles?.manifest);

  const projectedItems = projected.items as Readonly<Record<string, ProjectedCatalogItem | undefined>>;

  const source = Object.values(projectedItems)
    .flatMap((item) => item?.files ?? [])
    .sort((a, b) => a.path.localeCompare(b.path));

  const style = uniqueStyleFiles([...(styles?.files ?? []), ...projected.styles]);

  assertUniqueFiles(source, 'source');

  return {
    items: projected.items,
    files: {
      source,
      style,
    },
    references: resolved.references,
  };
}

async function projectModules<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  catalogItems: readonly CatalogItem<Definition>[],
  options: CatalogProjectionOptions<Definition>,
  styles: StyleManifest | undefined
): Promise<ProjectedCatalogSources<Definition>> {
  const layoutsByItem = new Map(
    catalogItems.map((catalogItem) => [catalogItem.name, createLayouts(catalog, catalogItem, options)] as const)
  );
  const entriesByInput = new Map(
    catalog.items.map((catalogItem) => [resolve(catalog.rootDir, catalogItem.source), catalogItem] as const)
  );
  const output: Record<string, ProjectedCatalogItem> = {};
  const assets: CatalogOutputFile[] = [];

  for (const catalogItem of catalogItems) {
    const layouts = layoutsByItem.get(catalogItem.name)!;
    const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
    const files: CatalogOutputFile[] = [];
    const config = transformConfig(options.projection, options.styles, catalogItem, styles);
    const configDir = transformCwd(options.projection.cwd, catalogItem) ?? catalog.rootDir;

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

      files.push(
        withModuleImports({
          path: layout.outputFile,
          content: rewriteRelativeImports(result.code, layout, layoutsByInput, layoutsByItem, entriesByInput, options),
        })
      );
    }

    const imports = collectItemImports(files);
    output[catalogItem.name] = {
      files,
      imports,
      dependencies: collectPackageDependencies(imports),
    };
  }

  return {
    items: output as CatalogProjectionResult<Definition>['items'],
    styles: uniqueStyleFiles(assets),
  };
}

async function loadStyles<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  catalogItems: readonly CatalogItem<Definition>[],
  styles: CatalogStyleTransform,
  options: CatalogProjectionOptions<Definition>
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

function transformConfig<Definition extends CatalogDefinition>(
  projection: CatalogProjection<Definition>,
  styles: CatalogStyleTransform | undefined,
  catalogItem: CatalogItem<Definition>,
  manifest: StyleManifest | undefined
): CompilerConfig {
  const config = resolveCatalogTransformConfig(projection, catalogItem);
  const plugins = [catalogMetaPlugin()];

  if (!manifest || !styles) return { ...config, plugins: [...plugins, ...(config.plugins ?? [])] };

  const styleOptions =
    styles.mode === 'tailwind'
      ? {
          mode: 'tailwind' as const,
          manifest,
          ...(styles.variant ? { variant: styles.variant } : {}),
        }
      : {
          mode: 'css' as const,
          manifest,
          ...(styles.variant ? { variant: styles.variant } : {}),
        };

  return {
    ...config,
    plugins: [...plugins, stylesPlugin(styleOptions), ...(config.plugins ?? [])],
  };
}

function missingProjectionItem(): never {
  throw new Error('Catalog projections with dynamic transform configuration require a catalog item.');
}

function transformCwd<Definition extends CatalogDefinition>(
  cwd: CatalogProjection<Definition>['cwd'],
  catalogItem: CatalogItem<Definition>
): string | undefined {
  return typeof cwd === 'function' ? cwd(catalogItem) : cwd;
}

function createLayouts<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  catalogItem: CatalogItem<Definition>,
  options: CatalogProjectionOptions<Definition>
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
  options: CatalogProjectionOptions<Definition>
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

function withModuleImports<File extends CatalogOutputFile>(file: File): File {
  const imports = uniqueModuleSpecifiers(file.imports ?? collectModuleSpecifiers(file.content, file.path));

  return {
    ...file,
    ...(imports.length > 0 ? { imports } : {}),
  };
}

function collectItemImports(files: readonly CatalogOutputFile[]): string[] {
  return uniqueModuleSpecifiers(files.flatMap((file) => file.imports ?? []));
}

function uniqueModuleSpecifiers(specifiers: readonly string[]): string[] {
  return [...new Set(specifiers.filter((specifier) => !specifier.startsWith('.')))].sort();
}

function collectPackageDependencies(imports: readonly string[]): string[] {
  const packages = new Set<string>();

  for (const specifier of imports) {
    if (isPackageSpecifier(specifier)) packages.add(packageName(specifier));
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
  options: CatalogProjectionOptions<Definition>
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
