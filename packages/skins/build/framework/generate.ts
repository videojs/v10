import { resolve } from 'node:path';
import { loadDesignSystem } from '@videojs/compiler/tailwind';
import type { ResolvedSkinCatalog } from '../graph/types';
import { generateHtmlSkinSource } from './html';
import { generateReactSkinSource } from './react';
import { createFrameworkStyleProgram, createFrameworkStyles, type FrameworkStyleFile } from './styles';

export type SkinFramework = 'html' | 'react';

export interface FrameworkSkinFiles {
  sourceFile: 'skin.ts' | 'skin.tsx';
  source: string;
  styles: readonly FrameworkStyleFile[];
}

export interface CreateFrameworkSkinOptions {
  framework: SkinFramework;
  rootDir: string;
  skin: string;
  iconSet?: string | undefined;
}

/** Create the compact, vanilla-CSS Skin projection consumed by a framework package. */
export async function createFrameworkSkin(
  catalog: ResolvedSkinCatalog,
  options: CreateFrameworkSkinOptions
): Promise<FrameworkSkinFiles> {
  const skin = catalog.items.find((item) => item.name === options.skin && item.type === 'skin');
  if (!skin) throw new Error(`Skin \`${options.skin}\` does not exist.`);

  const entryFile = resolve(options.rootDir, skin.source);
  const design = await loadDesignSystem(resolve(options.rootDir, catalog.resources.styles.tailwind));
  const program = createFrameworkStyleProgram(design);
  const iconSet = options.iconSet ?? 'default';
  const source =
    options.framework === 'html'
      ? await generateHtmlSkinSource(catalog, skin.name, entryFile, iconSet, program)
      : `// @ts-nocheck -- temporary bundled output; authored types remain in packages/skins/canonical.\n${await generateReactSkinSource(entryFile, iconSet, program)}`;

  return {
    sourceFile: options.framework === 'html' ? 'skin.ts' : 'skin.tsx',
    source,
    styles: await createFrameworkStyles(catalog.resources.styles, options.rootDir, design, await program.emit()),
  };
}

export type { FrameworkStyleFile } from './styles';
