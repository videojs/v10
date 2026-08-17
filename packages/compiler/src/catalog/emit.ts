import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, posix, resolve, sep } from 'node:path';
import type { CompilerConfig } from '../config';
import { transform } from '../transform';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '../utils/module-specifiers';
import type { CatalogDefinition } from './define';
import type { Catalog, CatalogItem } from './resolve';

export interface CatalogOutputFile {
  readonly path: string;
  readonly content: string;
}

export interface EmittedCatalogItem<File extends CatalogOutputFile = CatalogOutputFile> {
  readonly files: readonly File[];
  readonly dependencies: readonly string[];
}

export interface CatalogOutput<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly items: Readonly<Partial<Record<CatalogItem<Definition>['name'], EmittedCatalogItem>>>;
}

interface CatalogSourceContext<Definition extends CatalogDefinition> {
  readonly item: CatalogItem<Definition>;
  readonly sourceFile: string;
}

interface CatalogImportContext<Definition extends CatalogDefinition> {
  readonly item: CatalogItem<Definition>;
  readonly dependency: CatalogItem<Definition>;
  readonly importer: CatalogSourceContext<Definition> & { readonly outputFile: string };
  readonly importedFile: string;
  readonly specifier: string;
}

export interface EmitCatalogOptions<Definition extends CatalogDefinition = CatalogDefinition> {
  readonly items?: readonly CatalogItem<Definition>['name'][] | undefined;
  readonly compiler: {
    config(item: CatalogItem<Definition>): CompilerConfig;
    configDir?(item: CatalogItem<Definition>): string | undefined;
  };
  readonly resolve: {
    file(context: CatalogSourceContext<Definition>): string;
    readonly imports?: {
      dependency?(context: CatalogImportContext<Definition>): string | undefined;
    };
  };
}

interface CatalogLayout<Definition extends CatalogDefinition> extends CatalogSourceContext<Definition> {
  inputFile: string;
  outputFile: string;
}

/** Transform and relink editable source files for selected catalog items. */
export async function emitCatalog<const Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  options: EmitCatalogOptions<Definition>
): Promise<CatalogOutput<Definition>> {
  const itemsByName = new Map(catalog.items.map((item) => [item.name, item]));
  const selectedNames = options.items ?? catalog.items.map((item) => item.name);
  const selected = [...new Set(selectedNames)].sort().map((name) => itemsByName.get(name) ?? missingItem(name));
  const layoutsByItem = new Map(
    catalog.items.map((item) => [item.name, createLayouts(catalog, item, options)] as const)
  );
  const entriesByInput = new Map(catalog.items.map((item) => [resolve(catalog.rootDir, item.source), item] as const));
  const output: Record<string, EmittedCatalogItem> = {};

  for (const item of selected) {
    const layouts = layoutsByItem.get(item.name)!;
    const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
    const files: CatalogOutputFile[] = [];
    const config = options.compiler.config(item);
    const configDir = options.compiler.configDir?.(item);

    for (const layout of layouts) {
      const source = await readFile(layout.inputFile, 'utf8');
      const result = await transform(source, {
        filename: layout.inputFile,
        outputFile: resolve(catalog.rootDir, layout.outputFile),
        config,
        ...(configDir ? { configDir } : {}),
      });

      if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
        throw new Error(`Catalog item \`${item.name}\` module \`${layout.sourceFile}\` failed to transform.`);
      }

      files.push({
        path: layout.outputFile,
        content: rewriteRelativeImports(result.code, layout, layoutsByInput, layoutsByItem, entriesByInput, options),
      });
    }

    output[item.name] = {
      files,
      dependencies: collectPackageDependencies(files),
    };
  }

  return { items: output as CatalogOutput<Definition>['items'] };
}

function createLayouts<Definition extends CatalogDefinition>(
  catalog: Catalog<Definition>,
  item: CatalogItem<Definition>,
  options: EmitCatalogOptions<Definition>
): CatalogLayout<Definition>[] {
  const outputs = new Set<string>();
  return item.files.source
    .map((sourceFile) => {
      const outputFile = toPosixPath(options.resolve.file({ item, sourceFile }));

      if (outputs.has(outputFile)) {
        throw new Error(`Catalog item \`${item.name}\` output collision: \`${outputFile}\`.`);
      }

      outputs.add(outputFile);

      return {
        item,
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
  options: EmitCatalogOptions<Definition>
): string {
  return rewriteModuleSpecifiers(source, {
    filename: importer.outputFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;
      const importedFile = resolveSourceModule(importer.inputFile, specifier);
      if (!importedFile) {
        throw new Error(
          `Catalog item \`${importer.item.name}\` cannot resolve \`${specifier}\` from \`${importer.sourceFile}\`.`
        );
      }

      const local = layoutsByInput.get(importedFile);
      if (local) return relativeModulePath(posix.dirname(importer.outputFile), local.outputFile);

      const dependency = entriesByInput.get(importedFile);
      if (!dependency) {
        throw new Error(
          `Catalog item \`${importer.item.name}\` cannot map \`${specifier}\` from \`${importer.sourceFile}\`.`
        );
      }
      const dependencyEntry = layoutsByItem.get(dependency.name)?.find((layout) => layout.inputFile === importedFile);

      if (!dependencyEntry) {
        throw new Error(`Catalog output is missing item \`${dependency.name}\`.`);
      }

      const replacement = options.resolve.imports?.dependency?.({
        item: importer.item,
        dependency,
        importer,
        importedFile,
        specifier,
      });

      return replacement ?? relativeModulePath(posix.dirname(importer.outputFile), dependencyEntry.outputFile);
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

function resolveSourceModule(importer: string, specifier: string): string | undefined {
  const candidate = resolve(dirname(importer), specifier);

  if (sourceExtensions.has(extname(candidate)) && existsSync(candidate)) return candidate;

  for (const extension of sourceExtensions) {
    const fileName = `${candidate}${extension}`;
    if (existsSync(fileName)) return fileName;
  }

  for (const extension of sourceExtensions) {
    const fileName = resolve(candidate, `index${extension}`);
    if (existsSync(fileName)) return fileName;
  }

  return undefined;
}

function relativeModulePath(from: string, to: string): string {
  const path = posix.relative(from, withoutTypeScriptExtension(to));
  return path.startsWith('.') ? path : `./${path}`;
}

function withoutTypeScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?[jt]s|[jt]sx)$/, '');
}

function toPosixPath(path: string): string {
  return path.split(sep).join('/');
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

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
