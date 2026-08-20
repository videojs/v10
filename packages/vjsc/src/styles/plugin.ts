import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';

import ts from 'typescript';

import type { CompilerContext, CompilerPipelineStep, CompilerPlugin } from '../config';

import { compileStyles } from './compile';
import { type DesignSystem, loadDesignSystem } from './design-system';
import { loadStyleManifest, type StyleManifest } from './manifest';
import { isStyleModulePath, resolveStyleModuleFile } from './modules';
import { createStyleTransform } from './transform';

export interface StyleEmitOptions {
  /** Tailwind CSS entry used to resolve utilities, theme tokens, and variants. */
  readonly input: string;
  /** Optional selector wrapped around emitted CSS with `@scope`. */
  readonly scope?: string | undefined;
}

interface StylePluginBaseOptions {
  /** Variant utilities to append to every rule's base utilities. */
  readonly variant?: string | undefined;
  /** Preloaded definitions for programmatic builds; imports are discovered by default. */
  readonly manifest?: StyleManifest | undefined;
}

export type StylePluginOptions =
  | (StylePluginBaseOptions & {
      /** Project style references to editable Tailwind utility groups. */
      readonly mode: 'tailwind';
      readonly emit?: never;
    })
  | (StylePluginBaseOptions & {
      readonly mode: 'css';
      /** Emit vanilla CSS assets in addition to projecting semantic class names. */
      readonly emit?: StyleEmitOptions | undefined;
    });

/** Project imported style references and optionally emit their vanilla CSS assets. */
export function plugin(options: StylePluginOptions): CompilerPlugin {
  const designs = new Map<string, { mtimeMs: number; design: Promise<DesignSystem> }>();
  const manifests = new Map<string, CachedManifest>();

  return {
    name: 'vjsc:styles',
    enforce: 'pre',
    async setup(context) {
      const manifest = options.manifest ?? (await loadImportedManifest(context, manifests));

      if (!manifest || manifest.rules.length === 0) return {};

      for (const file of manifest.watchFiles) context.addWatchFile(file);

      const step: CompilerPipelineStep = {
        transform: createStyleTransform({
          manifest,
          mode: options.mode,
          ...(options.variant ? { variant: options.variant } : {}),
        }),
      };

      if (options.mode === 'css' && options.emit) {
        const emit = options.emit;
        const input = resolve(context.configDir, emit.input);

        context.addWatchFile(input);

        step.finish = async () => {
          const assets = await compileStyles({
            design: await cachedDesignSystem(designs, input),
            manifest,
            ...(emit.scope ? { scope: emit.scope } : {}),
            ...(options.variant ? { variant: options.variant } : {}),
          });

          for (const [fileName, source] of assets) {
            context.addAsset({ type: 'css', fileName, source });
          }
        };
      }

      return step;
    },
  };
}

interface CachedManifest {
  manifest: StyleManifest;
  versions: ReadonlyMap<string, number>;
}

async function cachedDesignSystem(
  designs: Map<string, { mtimeMs: number; design: Promise<DesignSystem> }>,
  input: string
): Promise<DesignSystem> {
  const mtimeMs = (await stat(input)).mtimeMs;
  const cached = designs.get(input);

  if (cached?.mtimeMs === mtimeMs) return cached.design;

  const design = loadDesignSystem(input);

  designs.set(input, { mtimeMs, design });

  return design;
}

async function loadImportedManifest(
  context: CompilerContext,
  cache: Map<string, CachedManifest>
): Promise<StyleManifest | undefined> {
  const files = isStyleModulePath(context.filename)
    ? [context.filename]
    : await importedStyleFiles(context.filename, context.sourceText);

  if (files.length === 0) return undefined;

  const key = [...files].sort().join('\0');
  const cached = cache.get(key);

  if (cached && (await versionsMatch(cached.versions))) return cached.manifest;

  const manifest = await loadStyleManifest(files);

  cache.set(key, { manifest, versions: await fileVersions(manifest.watchFiles) });

  return manifest;
}

async function fileVersions(files: readonly string[]): Promise<ReadonlyMap<string, number>> {
  return new Map(await Promise.all(files.map(async (file) => [file, (await stat(file)).mtimeMs] as const)));
}

async function versionsMatch(versions: ReadonlyMap<string, number>): Promise<boolean> {
  try {
    for (const [file, mtimeMs] of versions) {
      if ((await stat(file)).mtimeMs !== mtimeMs) return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function importedStyleFiles(filename: string, source: string): Promise<string[]> {
  const sourceFile = ts.createSourceFile(filename, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const files: string[] = [];

  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const specifier = statement.moduleSpecifier.text;

    if (!specifier.startsWith('.') || !isStyleModulePath(specifier)) continue;

    const file = resolveStyleModuleFile(filename, specifier);

    if (!file) throw new Error(`Cannot resolve style module \`${specifier}\` imported by \`${filename}\`.`);

    files.push(file);
  }

  return [...new Set(files)];
}
