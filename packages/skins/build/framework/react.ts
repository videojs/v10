import { readFile } from 'node:fs/promises';
import { dirname, posix, resolve } from 'node:path';
import { transform } from '@videojs/compiler';
import { rewriteModuleSpecifiers } from '@videojs/compiler/ast';
import { resolveSkinClosure } from '../catalog/resolve';
import type { ResolvedSkinCatalog } from '../catalog/types';
import { createCompilerReactConfig } from '../compiler/react';
import type { GeneratedFile } from '../output/files';
import type { SkinStyleManifest } from '../styles/manifest';

interface GenerateReactSkinsOptions {
  rootDir: string;
  skin: string;
  iconSet: string;
  styles: SkinStyleManifest;
}

interface FileLayout {
  inputFile: string;
  outputFile: string;
}

/** Transform the complete canonical Skin closure into editable React modules. */
export async function generateReactSkins(
  catalog: ResolvedSkinCatalog,
  options: GenerateReactSkinsOptions
): Promise<GeneratedFile[]> {
  const skin = catalog.items.find((item) => item.name === options.skin && item.type === 'skin');
  if (!skin) throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const entryPath = canonicalPath(skin.source);
  const entryDir = posix.dirname(entryPath);
  const layouts = resolveSkinClosure(catalog, skin.name)
    .files.map(canonicalPath)
    .filter(isReactFile)
    .map((path) => ({
      inputFile: resolve(options.rootDir, path),
      outputFile: path.startsWith(`${entryDir}/`) ? posix.relative(entryDir, path) : path,
    }))
    .sort((a, b) => a.outputFile.localeCompare(b.outputFile));
  const layoutsByInput = new Map(layouts.map((layout) => [layout.inputFile, layout]));
  const config = createCompilerReactConfig({
    style: 'vanilla',
    styles: options.styles,
    iconSet: options.iconSet,
  });

  const files: GeneratedFile[] = [];
  for (const layout of layouts) {
    const content = await readFile(layout.inputFile, 'utf8');
    const result = await transform(content, {
      filename: layout.inputFile,
      outputFile: resolve(options.rootDir, layout.outputFile),
      config,
    });
    if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
      throw new Error(`React Skin file \`${layout.inputFile}\` failed to transform.`);
    }
    files.push({
      path: layout.outputFile,
      content: rewriteRelativeImports(result.code, layout, layoutsByInput),
    });
  }
  return files;
}

function rewriteRelativeImports(
  content: string,
  layout: FileLayout,
  layoutsByInput: ReadonlyMap<string, FileLayout>
): string {
  return rewriteModuleSpecifiers(content, {
    filename: layout.outputFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;
      const imported = resolveFileLayout(layout.inputFile, specifier, layoutsByInput);
      if (!imported) {
        throw new Error(`React Skin file \`${layout.inputFile}\` cannot map relative import \`${specifier}\`.`);
      }
      const target = posix.relative(posix.dirname(layout.outputFile), withoutTypeScriptExtension(imported.outputFile));
      return target.startsWith('.') ? target : `./${target}`;
    },
  });
}

function resolveFileLayout(
  importer: string,
  specifier: string,
  layoutsByInput: ReadonlyMap<string, FileLayout>
): FileLayout | undefined {
  const base = resolve(dirname(importer), specifier);
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.mts`,
    `${base}.cts`,
    resolve(base, 'index.ts'),
    resolve(base, 'index.tsx'),
  ]) {
    const layout = layoutsByInput.get(candidate);
    if (layout) return layout;
  }
  return undefined;
}

function canonicalPath(path: string): string {
  return path.replace(/^\.\//, '');
}

function isReactFile(path: string): boolean {
  return !path.startsWith('styles/') && /\.[cm]?[jt]sx?$/.test(path);
}

function withoutTypeScriptExtension(path: string): string {
  return path.replace(/\.(?:[cm]?ts|tsx)$/, '');
}
