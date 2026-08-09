import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { posix, relative, resolve } from 'node:path';
import { compile } from '@videojs/compiler';
import { rewriteModuleSpecifiers } from '@videojs/compiler/ast';
import { createReactSkinSourceConfig } from '../compiler/react';
import {
  createSourceOutputFile,
  createStyleResourceFiles,
  type GenerateSourceOptions,
  generateSource,
  resolveSourceFile,
  type SkinItemContext,
  type SourceOutput,
  type SourceOutputFile,
  sourceEntryName,
  toPosixPath,
  withoutTypeScriptExtension,
} from '../source-output';
import type { ResolvedSkinManifest } from '../types';

export interface GenerateReactRegistryOptions extends GenerateSourceOptions {
  installAlias?: string | undefined;
}

/** Emit the React/Tailwind source projection consumed by the shadcn registry. */
export function generateReactRegistry(
  manifest: ResolvedSkinManifest,
  options: GenerateReactRegistryOptions
): Promise<SourceOutput> {
  const { installAlias = '@/components/videojs', ...sourceOptions } = options;
  return generateSource(manifest, sourceOptions, {
    outputEntryName: sourceEntryName,
    emitItem: (context) => emitReactItem(context, installAlias),
  });
}

async function emitReactItem(context: SkinItemContext, installAlias: string): Promise<SourceOutputFile[]> {
  const canonical = await readFile(context.inputFile, 'utf8');
  const result = await compile(canonical, {
    filename: context.inputFile,
    config: createReactSkinSourceConfig({ style: 'tailwind', iconSet: context.options.iconSet }),
    configDir: resolve(context.options.rootDir, context.itemDir),
    outputFile: resolve(context.options.rootDir, context.entryFile),
  });
  if (result.diagnostics.some((diagnostic) => diagnostic.level === 'error')) {
    throw new Error(`Skin item \`${context.item.name}\` failed React source emission.`);
  }

  const entrySource = rewriteRelativeImports(result.code, context, installAlias);
  return [...(await createStyleResourceFiles(context)), createSourceOutputFile(context.entryFile, entrySource)];
}

function rewriteRelativeImports(source: string, context: SkinItemContext, installAlias: string): string {
  return rewriteModuleSpecifiers(source, {
    filename: context.entryFile,
    resolve(specifier) {
      if (!specifier.startsWith('.')) return specifier;
      const importedFile = resolveSourceFile(context.inputFile, specifier);
      const dependency = context.layoutsByInput.get(importedFile);
      if (!existsSync(importedFile)) {
        throw new Error(
          `Skin item \`${context.item.name}\` has unresolved relative import \`${specifier}\` from \`${toPosixPath(
            relative(context.options.rootDir, context.inputFile)
          )}\`.`
        );
      }
      if (!dependency) {
        throw new Error(
          `Skin item \`${context.item.name}\` cannot map relative import \`${specifier}\` from \`${toPosixPath(
            relative(context.options.rootDir, context.inputFile)
          )}\`.`
        );
      }
      return `${installAlias}/${dependency.item.name}/${withoutTypeScriptExtension(posix.basename(dependency.entryFile))}`;
    },
  });
}
