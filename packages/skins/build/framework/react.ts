import { readFile } from 'node:fs/promises';
import { dirname, isAbsolute } from 'node:path';
import { compile } from '@videojs/compiler';
import type { StyleProgram } from '@videojs/compiler/tailwind';
import { type OutputChunk, type Plugin, rolldown } from 'rolldown';
import { createReactSkinSourceConfig } from '../targets/react';

/** Bundle the complete canonical Skin closure into one React module. */
export async function generateReactSkinSource(
  entryFile: string,
  iconSet: string,
  program: StyleProgram
): Promise<string> {
  const bundle = await rolldown({
    input: entryFile,
    platform: 'neutral',
    external: (id) => isBareModule(id),
    plugins: [canonicalReactPlugin(iconSet, program)],
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

function canonicalReactPlugin(iconSet: string, program: StyleProgram): Plugin {
  return {
    name: 'videojs-skins-react',
    async load(id) {
      if (!id.endsWith('.tsx')) return null;
      const source = await readFile(id, 'utf8');
      const result = await compile(source, {
        filename: id,
        config: createReactSkinSourceConfig({ style: 'css', iconSet, program }),
        configDir: dirname(id),
      });
      const errors = result.diagnostics.filter((diagnostic) => diagnostic.level === 'error');
      if (errors.length > 0) throw new Error(errors.map((diagnostic) => diagnostic.message).join('\n'));
      if (result.assets.length > 0) {
        throw new Error(`React Skin module \`${id}\` emitted CSS before the shared StyleProgram.`);
      }
      return { code: result.code, moduleType: 'tsx' };
    },
  };
}

function isBareModule(id: string): boolean {
  return !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0');
}
