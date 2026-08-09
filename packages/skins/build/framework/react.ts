import { isAbsolute } from 'node:path';
import { build } from '@videojs/compiler';
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
  const result = await build({
    ...createCompilerReactConfig({ style: 'vanilla', styles, usage, iconSet }),
    input: entryFile,
    external: (source) => isBareModule(source),
    output: { file: entryFile },
  });
  const chunks = result.files.filter((file) => file.type === 'chunk');
  if (chunks.length !== 1 || !chunks[0]) {
    throw new Error(`React Skin generation expected one output chunk, but received ${chunks.length}.`);
  }
  return chunks[0].source;
}

function isBareModule(id: string): boolean {
  return !id.startsWith('.') && !isAbsolute(id) && !id.startsWith('\0');
}
