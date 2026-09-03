import { pascalCase } from '@videojs/utils/string';

import { type SkinName, type SkinStyle, skinStyles } from '../src/meta.ts';
import { skinDirectory, type SkinPreset, skinPreset } from './skin.ts';

/** Everything a consumer needs to address one published skin without re-deriving names from conventions. */
export interface SkinCatalogEntry {
  readonly name: SkinName;
  readonly theme: SkinStyle['theme'];
  readonly preset: SkinPreset;
  readonly media: 'audio' | 'video';
  readonly live: boolean;
  /** Human-readable label such as `Default Live Video`. */
  readonly label: string;
  /** Component exported by the authored skin module and the generated package module, such as `DefaultVideoSkin`. */
  readonly exportName: string;
  /** Public React component name in `@videojs/react`, such as `MinimalVideoSkin`. */
  readonly component: string;
  /** Custom element tag names for the packaged CSS skin and the registry-installed Tailwind skin. */
  readonly tags: { readonly css: string; readonly tailwind: string };
  /** Shadcn registry item name, such as `video` or `video-minimal`. */
  readonly registryItem: string;
  /** Registry installation directory relative to the components path, such as `skins/video/minimal`. */
  readonly directory: string;
}

function describe(name: SkinName): SkinCatalogEntry {
  const style = skinStyles[name];
  const preset = skinPreset(name);
  const minimal = style.theme === 'minimal';
  const cssTag = minimal ? `${preset}-minimal-skin` : `${preset}-skin`;

  return {
    name,
    theme: style.theme,
    preset,
    media: preset.endsWith('audio') ? 'audio' : 'video',
    live: preset.startsWith('live-'),
    label: `${pascalCase(style.theme)} ${preset.split('-').map(pascalCase).join(' ')}`,
    exportName: `${pascalCase(style.theme)}${pascalCase(preset)}Skin`,
    component: `${minimal ? 'Minimal' : ''}${pascalCase(preset)}Skin`,
    tags: { css: cssTag, tailwind: `${cssTag}-tailwind` },
    registryItem: minimal ? `${preset}-minimal` : preset,
    directory: skinDirectory(name),
  };
}

/** Every published skin, in `skinStyles` order. */
export const skinCatalog: readonly SkinCatalogEntry[] = (Object.keys(skinStyles) as SkinName[]).map(describe);

export function skinCatalogEntry(name: SkinName): SkinCatalogEntry {
  const entry = skinCatalog.find((candidate) => candidate.name === name);
  if (!entry) throw new Error(`Unknown skin: \`${name}\`.`);

  return entry;
}
