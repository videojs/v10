import type { Skin, Styling } from '@app/types';

import type { SkinPreset } from './html/skin-tags';

type AuthoredKey = `${'react' | 'html'}/${SkinPreset}/${Skin}/${Styling}`;

/**
 * The authored skins, compiled on request by the skins' Vite preset. Each query names the styling, the render target,
 * and the skin, so the compiler can transform one module into any of the four outputs. Only the workspace has these
 * files; the loaders are reached through a dynamic import that nothing outside it ever follows.
 */
const authoredSkins = {
  'react/video/default/css': () =>
    import('../../../../packages/skins/src/skins/default-video/skin.tsx?style=css&target=react&skin=default-video'),
  'react/video/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-video/skin.tsx?style=tailwind&target=react&skin=default-video'),
  'react/video/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-video/skin.tsx?style=css&target=react&skin=minimal-video'),
  'react/video/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-video/skin.tsx?style=tailwind&target=react&skin=minimal-video'),
  'react/live-video/default/css': () =>
    import('../../../../packages/skins/src/skins/default-live-video/skin.tsx?style=css&target=react&skin=default-live-video'),
  'react/live-video/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-live-video/skin.tsx?style=tailwind&target=react&skin=default-live-video'),
  'react/live-video/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-live-video/skin.tsx?style=css&target=react&skin=minimal-live-video'),
  'react/live-video/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-live-video/skin.tsx?style=tailwind&target=react&skin=minimal-live-video'),
  'react/audio/default/css': () =>
    import('../../../../packages/skins/src/skins/default-audio/skin.tsx?style=css&target=react&skin=default-audio'),
  'react/audio/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-audio/skin.tsx?style=tailwind&target=react&skin=default-audio'),
  'react/audio/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-audio/skin.tsx?style=css&target=react&skin=minimal-audio'),
  'react/audio/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-audio/skin.tsx?style=tailwind&target=react&skin=minimal-audio'),
  'react/live-audio/default/css': () =>
    import('../../../../packages/skins/src/skins/default-live-audio/skin.tsx?style=css&target=react&skin=default-live-audio'),
  'react/live-audio/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-live-audio/skin.tsx?style=tailwind&target=react&skin=default-live-audio'),
  'react/live-audio/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-live-audio/skin.tsx?style=css&target=react&skin=minimal-live-audio'),
  'react/live-audio/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-live-audio/skin.tsx?style=tailwind&target=react&skin=minimal-live-audio'),
  'html/video/default/css': () =>
    import('../../../../packages/skins/src/skins/default-video/skin.tsx?style=css&target=html&skin=default-video'),
  'html/video/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-video/skin.tsx?style=tailwind&target=html&skin=default-video'),
  'html/video/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-video/skin.tsx?style=css&target=html&skin=minimal-video'),
  'html/video/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-video/skin.tsx?style=tailwind&target=html&skin=minimal-video'),
  'html/live-video/default/css': () =>
    import('../../../../packages/skins/src/skins/default-live-video/skin.tsx?style=css&target=html&skin=default-live-video'),
  'html/live-video/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-live-video/skin.tsx?style=tailwind&target=html&skin=default-live-video'),
  'html/live-video/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-live-video/skin.tsx?style=css&target=html&skin=minimal-live-video'),
  'html/live-video/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-live-video/skin.tsx?style=tailwind&target=html&skin=minimal-live-video'),
  'html/audio/default/css': () =>
    import('../../../../packages/skins/src/skins/default-audio/skin.tsx?style=css&target=html&skin=default-audio'),
  'html/audio/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-audio/skin.tsx?style=tailwind&target=html&skin=default-audio'),
  'html/audio/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-audio/skin.tsx?style=css&target=html&skin=minimal-audio'),
  'html/audio/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-audio/skin.tsx?style=tailwind&target=html&skin=minimal-audio'),
  'html/live-audio/default/css': () =>
    import('../../../../packages/skins/src/skins/default-live-audio/skin.tsx?style=css&target=html&skin=default-live-audio'),
  'html/live-audio/default/tailwind': () =>
    import('../../../../packages/skins/src/skins/default-live-audio/skin.tsx?style=tailwind&target=html&skin=default-live-audio'),
  'html/live-audio/minimal/css': () =>
    import('../../../../packages/skins/src/skins/minimal-live-audio/skin.tsx?style=css&target=html&skin=minimal-live-audio'),
  'html/live-audio/minimal/tailwind': () =>
    import('../../../../packages/skins/src/skins/minimal-live-audio/skin.tsx?style=tailwind&target=html&skin=minimal-live-audio'),
} satisfies Record<AuthoredKey, () => Promise<object>>;

/** The export a compiled skin module carries, such as `DefaultLiveVideoSkin`; the same name on both targets. */
export function authoredExportName(preset: SkinPreset, skin: Skin): string {
  const words = [skin, ...preset.split('-')].map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return `${words.join('')}Skin`;
}

/**
 * Tailwind for authored skins: the skins' own entry plus the utilities the compiler recorded. Loaded once, and only for
 * a Tailwind skin, so pages that never show one never pull a second Tailwind root.
 */
let tailwind: Promise<unknown> | undefined;

function loadAuthoredTailwind(): Promise<unknown> {
  tailwind ??= import('../styles.authored.css');

  return tailwind;
}

export async function loadAuthoredSkinModule(
  target: 'react' | 'html',
  preset: SkinPreset,
  skin: Skin,
  styling: Styling
): Promise<object> {
  const [module] = await Promise.all([
    authoredSkins[`${target}/${preset}/${skin}/${styling}`](),
    styling === 'tailwind' ? loadAuthoredTailwind() : undefined,
  ]);

  return module;
}
