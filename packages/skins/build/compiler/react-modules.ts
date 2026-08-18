import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, extname, posix, resolve, sep } from 'node:path';
import { type CompilerConfig, transform } from '@videojs/compiler';
import { collectModuleSpecifiers, rewriteModuleSpecifiers } from '@videojs/compiler/ast';
import type { GeneratedFile } from '../output/files';

export interface ReactModuleLayout {
  inputFile: string;
  outputFile: string;
}

export interface ReactModuleImportContext {
  importer: ReactModuleLayout;
  importedFile: string;
  specifier: string;
}

interface EmitReactModulesOptions {
  rootDir: string;
  layouts: readonly ReactModuleLayout[];
  config: CompilerConfig;
  configDir?: string | undefined;
  description: string;
  resolveRelativeImport?: ((context: ReactModuleImportContext) => string | undefined) | undefined;
}

export interface ReactModuleOutput {
  files: readonly GeneratedFile[];
  dependencies: readonly string[];
}

/** Transform and relink a complete editable React module set. */
export async function emitReactModules(options: EmitReactModulesOptions): Promise<ReactModuleOutput> {
  const layouts = normalizeLayouts(options.layouts);
  const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
  const files: GeneratedFile[] = [];

  for (const layout of layouts) {
    const source = await readFile(layout.inputFile, 'utf8');
    const result = await transform(source, {
      filename: layout.inputFile,
      outputFile: resolve(options.rootDir, layout.outputFile),
      config: options.config,
      ...(options.configDir ? { configDir: options.configDir } : {}),
    });
    if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
      throw new Error(`${options.description} module \`${layout.inputFile}\` failed to transform.`);
    }

    files.push({
      path: layout.outputFile,
      content: rewriteRelativeImports(result.code, layout, layoutsByInput, options),
    });
  }

  return { files, dependencies: collectPackageDependencies(files) };
}

function normalizeLayouts(layouts: readonly ReactModuleLayout[]): ReactModuleLayout[] {
  const inputs = new Set<string>();
  const outputs = new Set<string>();
  return layouts
    .map((layout) => ({ inputFile: resolve(layout.inputFile), outputFile: toPosixPath(layout.outputFile) }))
    .sort((a, b) => a.outputFile.localeCompare(b.outputFile))
    .map((layout) => {
      if (inputs.has(layout.inputFile)) throw new Error(`React module input \`${layout.inputFile}\` is listed twice.`);
      if (outputs.has(layout.outputFile)) throw new Error(`React module output collision: \`${layout.outputFile}\`.`);
      inputs.add(layout.inputFile);
      outputs.add(layout.outputFile);
      return layout;
    });
}

function rewriteRelativeImports(
  source: string,
  importer: ReactModuleLayout,
  layoutsByInput: ReadonlyMap<string, ReactModuleLayout>,
  options: EmitReactModulesOptions
): string {
  return rewriteModuleSpecifiers(source, {
    filename: importer.outputFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;
      const importedFile = resolveSourceModule(importer.inputFile, specifier);
      if (!importedFile) {
        throw new Error(`${options.description} cannot resolve \`${specifier}\` from \`${importer.inputFile}\`.`);
      }

      const imported = layoutsByInput.get(importedFile);
      if (imported) return relativeModulePath(posix.dirname(importer.outputFile), imported.outputFile);

      const replacement = options.resolveRelativeImport?.({ importer, importedFile, specifier });
      if (replacement) return replacement;
      throw new Error(`${options.description} cannot map \`${specifier}\` from \`${importer.inputFile}\`.`);
    },
  });
}

function collectPackageDependencies(files: readonly GeneratedFile[]): string[] {
  const packages = new Set<string>();
  for (const file of files) {
    for (const specifier of collectModuleSpecifiers(file.content, file.path)) {
      if (isPackageSpecifier(specifier)) packages.add(packageName(specifier));
    }
  }
  return [...packages].sort();
}

export function resolveSourceModule(importer: string, specifier: string): string | undefined {
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

const sourceExtensions = new Set(['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs']);
