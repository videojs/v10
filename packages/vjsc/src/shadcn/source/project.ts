import { readFile } from 'node:fs/promises';
import { posix, resolve } from 'node:path';

import type { CompilerConfig } from '../../config';
import { moduleMetaPlugin } from '../../meta';
import { compileStyles } from '../../styles/compile';
import { loadDesignSystem } from '../../styles/design-system';
import { collectReferencedStyleRules, type StyleManifest } from '../../styles/manifest';
import { plugin as stylesPlugin } from '../../styles/plugin';
import { transform } from '../../transform';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '../../utils/module-specifiers';
import { toPosixPath } from '../../utils/path';
import { relativeModuleSpecifier, resolveSourceModule } from '../../utils/source-module';
import type { SourceDefinition } from './define';
import { resolveSource, type Source, type SourceItem, type SourceResolution } from './resolve';
import { loadSourceStyles } from './styles';

export interface SourceOutputFile {
  readonly path: string;
  readonly content: string;
  /** Exact non-relative module specifiers retained by this output file. */
  readonly imports?: readonly string[] | undefined;
}

export interface SourceOutputFiles {
  readonly source: readonly SourceOutputFile[];
  readonly style: readonly SourceOutputFile[];
}

export interface TransformedSourceItem<File extends SourceOutputFile = SourceOutputFile> {
  readonly files: readonly File[];
  /** Exact non-relative module specifiers retained by every transformed file. */
  readonly imports: readonly string[];
  /** Package names derived from `imports`. */
  readonly dependencies: readonly string[];
}

export interface SourceTransformResult<Definition extends SourceDefinition = SourceDefinition> {
  readonly items: Readonly<Partial<Record<SourceItem<Definition>['name'], TransformedSourceItem>>>;
  readonly files: SourceOutputFiles;
  readonly references: SourceResolution<Definition>['references'];
}

export interface SourceFileContext<Definition extends SourceDefinition = SourceDefinition> {
  readonly sourceItem: SourceItem<Definition>;
  readonly sourceFile: string;
}

export interface SourceStyleContext {
  readonly fileName: string;
}

export interface SourceImportContext<Definition extends SourceDefinition = SourceDefinition> {
  readonly sourceItem: SourceItem<Definition>;
  readonly dependency: SourceItem<Definition>;
  readonly importer: SourceFileContext<Definition> & { readonly outputFile: string };
  readonly importedFile: string;
  readonly specifier: string;
}

export type SourceStyleTransform =
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

export interface SourceTransformer<Definition extends SourceDefinition = SourceDefinition> {
  readonly transform?: CompilerConfig | ((sourceItem: SourceItem<Definition>) => CompilerConfig) | undefined;
  readonly cwd?: string | ((sourceItem: SourceItem<Definition>) => string | undefined) | undefined;
}

export interface SourceTransformerOptions<Definition extends SourceDefinition = SourceDefinition> {
  /** Entry items. Transformation includes their transitive source dependencies. */
  readonly items?: readonly SourceItem<Definition>['name'][] | undefined;
  readonly transformer: SourceTransformer<Definition>;
  readonly styles?: SourceStyleTransform | undefined;
  readonly files: {
    source(context: SourceFileContext<Definition>): string;
    style?(context: SourceStyleContext): string;
  };
  readonly resolve?: {
    readonly imports?: {
      dependency?(context: SourceImportContext<Definition>): string | undefined;
    };
  };
}

/** Resolve the transform configuration contributed by a source transformer. */
export function resolveSourceTransformConfig<Definition extends SourceDefinition>(
  transformer: SourceTransformer<Definition>,
  sourceItem?: SourceItem<Definition>
): CompilerConfig {
  const configured = transformer.transform;
  const config =
    typeof configured === 'function'
      ? sourceItem
        ? configured(sourceItem)
        : missingTransformerItem()
      : (configured ?? {});
  return config;
}

interface SourceLayout<Definition extends SourceDefinition> extends SourceFileContext<Definition> {
  inputFile: string;
  outputFile: string;
}

interface LoadedSourceStyles {
  manifest: StyleManifest;
  files: SourceOutputFile[];
}

interface TransformedSources<Definition extends SourceDefinition> {
  items: SourceTransformResult<Definition>['items'];
  styles: SourceOutputFile[];
}

/** Resolve and transform editable source and style files for requested source entries. */
export async function transformSource<const Definition extends SourceDefinition>(
  source: Source<Definition>,
  options: SourceTransformerOptions<Definition>
): Promise<SourceTransformResult<Definition>> {
  const requestedNames = options.items ?? source.items.map((sourceItem) => sourceItem.name);
  const resolved = resolveSource(source, requestedNames);

  const styles = options.styles ? await loadStyles(source, resolved.items, options.styles, options) : undefined;

  const transformed = await transformModules(source, resolved.items, options, styles?.manifest);

  const transformedItems = transformed.items as Readonly<Record<string, TransformedSourceItem | undefined>>;

  const sourceFiles = Object.values(transformedItems)
    .flatMap((item) => item?.files ?? [])
    .sort((a, b) => a.path.localeCompare(b.path));

  const style = uniqueStyleFiles([...(styles?.files ?? []), ...transformed.styles]);

  assertUniqueFiles(sourceFiles, 'source');

  return {
    items: transformed.items,
    files: {
      source: sourceFiles,
      style,
    },
    references: resolved.references,
  };
}

async function transformModules<Definition extends SourceDefinition>(
  source: Source<Definition>,
  sourceItems: readonly SourceItem<Definition>[],
  options: SourceTransformerOptions<Definition>,
  styles: StyleManifest | undefined
): Promise<TransformedSources<Definition>> {
  const layoutsByItem = new Map(
    sourceItems.map((sourceItem) => [sourceItem.name, createLayouts(source, sourceItem, options)] as const)
  );
  const entriesByInput = new Map(
    source.items.map((sourceItem) => [resolve(source.rootDir, sourceItem.source), sourceItem] as const)
  );
  const output: Record<string, TransformedSourceItem> = {};
  const assets: SourceOutputFile[] = [];

  for (const sourceItem of sourceItems) {
    const layouts = layoutsByItem.get(sourceItem.name)!;
    const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
    const files: SourceOutputFile[] = [];
    const config = transformConfig(options.transformer, options.styles, sourceItem, styles);
    const configDir = transformCwd(options.transformer.cwd, sourceItem) ?? source.rootDir;

    for (const layout of layouts) {
      const code = await readFile(layout.inputFile, 'utf8');
      const result = await transform(code, {
        filename: layout.inputFile,
        outputFile: resolve(source.rootDir, layout.outputFile),
        config,
        configDir,
      });

      if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
        throw new Error(`Source item \`${sourceItem.name}\` module \`${layout.sourceFile}\` failed to transform.`);
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
    output[sourceItem.name] = {
      files,
      imports,
      dependencies: collectPackageDependencies(imports),
    };
  }

  return {
    items: output as SourceTransformResult<Definition>['items'],
    styles: uniqueStyleFiles(assets),
  };
}

async function loadStyles<Definition extends SourceDefinition>(
  source: Source<Definition>,
  sourceItems: readonly SourceItem<Definition>[],
  styles: SourceStyleTransform,
  options: SourceTransformerOptions<Definition>
): Promise<LoadedSourceStyles> {
  const itemNames = sourceItems.map((sourceItem) => sourceItem.name);
  const manifest = await loadSourceStyles(source, itemNames);

  if (styles.mode === 'tailwind') return { manifest, files: [] };

  const ruleClassNames = await collectReferencedStyleRules(
    sourceItems.flatMap((sourceItem) => sourceItem.files.source.map((file) => resolve(source.rootDir, file))),
    manifest
  );
  const compiled = await compileStyles({
    design: await loadDesignSystem(resolve(source.rootDir, styles.input)),
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

function transformConfig<Definition extends SourceDefinition>(
  transformer: SourceTransformer<Definition>,
  styles: SourceStyleTransform | undefined,
  sourceItem: SourceItem<Definition>,
  manifest: StyleManifest | undefined
): CompilerConfig {
  const config = resolveSourceTransformConfig(transformer, sourceItem);
  const plugins = [moduleMetaPlugin()];

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

function missingTransformerItem(): never {
  throw new Error('Dynamic source transformers require a source item.');
}

function transformCwd<Definition extends SourceDefinition>(
  cwd: SourceTransformer<Definition>['cwd'],
  sourceItem: SourceItem<Definition>
): string | undefined {
  return typeof cwd === 'function' ? cwd(sourceItem) : cwd;
}

function createLayouts<Definition extends SourceDefinition>(
  source: Source<Definition>,
  sourceItem: SourceItem<Definition>,
  options: SourceTransformerOptions<Definition>
): SourceLayout<Definition>[] {
  const outputs = new Set<string>();

  return sourceItem.files.source
    .map((sourceFile) => {
      const outputFile = toPosixPath(options.files.source({ sourceItem, sourceFile }));

      if (outputs.has(outputFile)) {
        throw new Error(`Source item \`${sourceItem.name}\` output collision: \`${outputFile}\`.`);
      }

      outputs.add(outputFile);

      return {
        sourceItem,
        sourceFile,
        inputFile: resolve(source.rootDir, sourceFile),
        outputFile,
      };
    })
    .sort((a, b) => a.outputFile.localeCompare(b.outputFile));
}

function rewriteRelativeImports<Definition extends SourceDefinition>(
  source: string,
  importer: SourceLayout<Definition>,
  layoutsByInput: ReadonlyMap<string, SourceLayout<Definition>>,
  layoutsByItem: ReadonlyMap<string, readonly SourceLayout<Definition>[]>,
  entriesByInput: ReadonlyMap<string, SourceItem<Definition>>,
  options: SourceTransformerOptions<Definition>
): string {
  return rewriteModuleSpecifiers(source, {
    filename: importer.outputFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;

      const importedFile = resolveSourceModule(importer.inputFile, specifier);

      if (!importedFile) {
        throw new Error(
          `Source item \`${importer.sourceItem.name}\` cannot resolve \`${specifier}\` from \`${importer.sourceFile}\`.`
        );
      }

      const local = layoutsByInput.get(importedFile);

      if (local) return relativeModuleSpecifier(posix.dirname(importer.outputFile), local.outputFile);

      const dependency = entriesByInput.get(importedFile);

      if (!dependency) {
        throw new Error(
          `Source item \`${importer.sourceItem.name}\` cannot map \`${specifier}\` from \`${importer.sourceFile}\`.`
        );
      }

      const dependencyEntry = layoutsByItem.get(dependency.name)?.find((layout) => layout.inputFile === importedFile);

      if (!dependencyEntry) throw new Error(`Source output is missing item \`${dependency.name}\`.`);

      const replacement = options.resolve?.imports?.dependency?.({
        sourceItem: importer.sourceItem,
        dependency,
        importer,
        importedFile,
        specifier,
      });

      return replacement ?? relativeModuleSpecifier(posix.dirname(importer.outputFile), dependencyEntry.outputFile);
    },
  });
}

function withModuleImports<File extends SourceOutputFile>(file: File): File {
  const imports = uniqueModuleSpecifiers(file.imports ?? collectModuleSpecifiers(file.content, file.path));

  return {
    ...file,
    ...(imports.length > 0 ? { imports } : {}),
  };
}

function collectItemImports(files: readonly SourceOutputFile[]): string[] {
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

function assertUniqueFiles(files: readonly SourceOutputFile[], kind: 'source' | 'style'): void {
  const paths = new Set<string>();

  for (const file of files) {
    if (paths.has(file.path)) throw new Error(`Source ${kind} output collision: \`${file.path}\`.`);
    paths.add(file.path);
  }
}

function uniqueStyleFiles(files: readonly SourceOutputFile[]): SourceOutputFile[] {
  const unique = new Map<string, SourceOutputFile>();

  for (const file of files) {
    const previous = unique.get(file.path);

    if (previous?.content !== undefined && previous.content !== file.content) {
      throw new Error(`Source style output collision: \`${file.path}\`.`);
    }

    unique.set(file.path, file);
  }

  return [...unique.values()].sort((a, b) => a.path.localeCompare(b.path));
}

function styleOutputPath<Definition extends SourceDefinition>(
  fileName: string,
  options: SourceTransformerOptions<Definition>
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
