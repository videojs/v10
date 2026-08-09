import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { compile } from '@videojs/compiler';
import { type OutputChunk, type Plugin, rolldown } from 'rolldown';
import { createCompilerReactConfig } from '../compiler/react';
import type { SkinStyleManifest } from '../styles/manifest';
import type { MutableSkinStyleUsage } from '../styles/transform';

/** Bundle the complete canonical Skin closure into one React module. */
export async function generateReactSkinSource(
  entryFile: string,
  iconSet: string,
  styles: SkinStyleManifest,
  usage: MutableSkinStyleUsage
): Promise<string> {
  const bundle = await rolldown({
    input: entryFile,
    platform: 'neutral',
    external: (id) => isBareModule(id),
    plugins: [canonicalReactPlugin(iconSet, styles, usage)],
    transform: { jsx: 'preserve' },
    experimental: { attachDebugInfo: 'none' },
  });
  const output = await bundle.generate({ format: 'esm', comments: false }).finally(() => bundle.close());
  const chunks = output.output.filter((item): item is OutputChunk => item.type === 'chunk');
  if (chunks.length !== 1) {
    throw new Error(`React Skin generation expected one output chunk, but received ${chunks.length}.`);
  }
  const source = chunks[0]?.code;
  if (!source) throw new Error(`React Skin generation produced no output for \`${entryFile}\`.`);
  return source;
}

function canonicalReactPlugin(iconSet: string, styles: SkinStyleManifest, usage: MutableSkinStyleUsage): Plugin {
  return {
    name: 'videojs-skins-react',
    async load(id) {
      if (!id.endsWith('.tsx')) return null;
      const source = await readFile(id, 'utf8');
      const result = await compile(source, {
        filename: id,
        config: createCompilerReactConfig({ style: 'vanilla', styles, usage, iconSet }),
        configDir: dirname(id),
      });
      const errors = result.diagnostics.filter((diagnostic) => diagnostic.level === 'error');
      if (errors.length > 0) throw new Error(errors.map((diagnostic) => diagnostic.message).join('\n'));
      if (result.assets.length > 0) throw new Error(`React Skin module \`${id}\` unexpectedly emitted assets.`);
      return { code: result.code, moduleType: 'tsx' };
    },
  };
}

function isBareModule(id: string): boolean {
  return !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0');
}
