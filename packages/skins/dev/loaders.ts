import type { PreviewOptions } from './options';

export type HtmlPreviewSkin = (props?: { className?: string }) => { toString(): string };
export type ReactPreviewSkin = React.ComponentType<React.PropsWithChildren<{ className?: string }>>;
export type PreviewSkin = HtmlPreviewSkin | ReactPreviewSkin;

const modules = {
  'react/default-video/css': () =>
    import('../src/skins/default-video/skin.tsx?style=css&target=react&skin=default-video'),
  'react/default-video/tailwind': () =>
    import('../src/skins/default-video/skin.tsx?style=tailwind&target=react&skin=default-video'),
  'react/minimal-video/css': () =>
    import('../src/skins/minimal-video/skin.tsx?style=css&target=react&skin=minimal-video'),
  'react/minimal-video/tailwind': () =>
    import('../src/skins/minimal-video/skin.tsx?style=tailwind&target=react&skin=minimal-video'),
  'react/default-live-video/css': () =>
    import('../src/skins/default-live-video/skin.tsx?style=css&target=react&skin=default-live-video'),
  'react/default-live-video/tailwind': () =>
    import('../src/skins/default-live-video/skin.tsx?style=tailwind&target=react&skin=default-live-video'),
  'react/minimal-live-video/css': () =>
    import('../src/skins/minimal-live-video/skin.tsx?style=css&target=react&skin=minimal-live-video'),
  'react/minimal-live-video/tailwind': () =>
    import('../src/skins/minimal-live-video/skin.tsx?style=tailwind&target=react&skin=minimal-live-video'),
  'react/default-live-audio/css': () =>
    import('../src/skins/default-live-audio/skin.tsx?style=css&target=react&skin=default-live-audio'),
  'react/default-live-audio/tailwind': () =>
    import('../src/skins/default-live-audio/skin.tsx?style=tailwind&target=react&skin=default-live-audio'),
  'react/minimal-live-audio/css': () =>
    import('../src/skins/minimal-live-audio/skin.tsx?style=css&target=react&skin=minimal-live-audio'),
  'react/minimal-live-audio/tailwind': () =>
    import('../src/skins/minimal-live-audio/skin.tsx?style=tailwind&target=react&skin=minimal-live-audio'),
  'react/default-audio/css': () =>
    import('../src/skins/default-audio/skin.tsx?style=css&target=react&skin=default-audio'),
  'react/default-audio/tailwind': () =>
    import('../src/skins/default-audio/skin.tsx?style=tailwind&target=react&skin=default-audio'),
  'react/minimal-audio/css': () =>
    import('../src/skins/minimal-audio/skin.tsx?style=css&target=react&skin=minimal-audio'),
  'react/minimal-audio/tailwind': () =>
    import('../src/skins/minimal-audio/skin.tsx?style=tailwind&target=react&skin=minimal-audio'),
  'html/default-video/css': () =>
    import('../src/skins/default-video/skin.tsx?style=css&target=html&skin=default-video'),
  'html/default-video/tailwind': () =>
    import('../src/skins/default-video/skin.tsx?style=tailwind&target=html&skin=default-video'),
  'html/minimal-video/css': () =>
    import('../src/skins/minimal-video/skin.tsx?style=css&target=html&skin=minimal-video'),
  'html/minimal-video/tailwind': () =>
    import('../src/skins/minimal-video/skin.tsx?style=tailwind&target=html&skin=minimal-video'),
  'html/default-live-video/css': () =>
    import('../src/skins/default-live-video/skin.tsx?style=css&target=html&skin=default-live-video'),
  'html/default-live-video/tailwind': () =>
    import('../src/skins/default-live-video/skin.tsx?style=tailwind&target=html&skin=default-live-video'),
  'html/minimal-live-video/css': () =>
    import('../src/skins/minimal-live-video/skin.tsx?style=css&target=html&skin=minimal-live-video'),
  'html/minimal-live-video/tailwind': () =>
    import('../src/skins/minimal-live-video/skin.tsx?style=tailwind&target=html&skin=minimal-live-video'),
  'html/default-live-audio/css': () =>
    import('../src/skins/default-live-audio/skin.tsx?style=css&target=html&skin=default-live-audio'),
  'html/default-live-audio/tailwind': () =>
    import('../src/skins/default-live-audio/skin.tsx?style=tailwind&target=html&skin=default-live-audio'),
  'html/minimal-live-audio/css': () =>
    import('../src/skins/minimal-live-audio/skin.tsx?style=css&target=html&skin=minimal-live-audio'),
  'html/minimal-live-audio/tailwind': () =>
    import('../src/skins/minimal-live-audio/skin.tsx?style=tailwind&target=html&skin=minimal-live-audio'),
  'html/default-audio/css': () =>
    import('../src/skins/default-audio/skin.tsx?style=css&target=html&skin=default-audio'),
  'html/default-audio/tailwind': () =>
    import('../src/skins/default-audio/skin.tsx?style=tailwind&target=html&skin=default-audio'),
  'html/minimal-audio/css': () =>
    import('../src/skins/minimal-audio/skin.tsx?style=css&target=html&skin=minimal-audio'),
  'html/minimal-audio/tailwind': () =>
    import('../src/skins/minimal-audio/skin.tsx?style=tailwind&target=html&skin=minimal-audio'),
} as const;

type ModuleKey = keyof typeof modules;

const skinExports = {
  'default-video': 'DefaultVideoSkin',
  'minimal-video': 'MinimalVideoSkin',
  'default-live-video': 'DefaultLiveVideoSkin',
  'minimal-live-video': 'MinimalLiveVideoSkin',
  'default-live-audio': 'DefaultLiveAudioSkin',
  'minimal-live-audio': 'MinimalLiveAudioSkin',
  'default-audio': 'DefaultAudioSkin',
  'minimal-audio': 'MinimalAudioSkin',
} as const satisfies Record<PreviewOptions['skin'], string>;

type SkinExport = (typeof skinExports)[keyof typeof skinExports];
type SkinModule = Partial<Record<SkinExport, PreviewSkin>>;

/** Load one statically discoverable authored Skin transform. */
export async function loadSkin(options: PreviewOptions): Promise<PreviewSkin> {
  const key: ModuleKey = `${options.framework}/${options.skin}/${options.styleMode}`;
  // SAFETY: every static module is transformed to the framework-specific Skin export selected below.
  const loaded = (await modules[key]()) as SkinModule;
  const Skin = loaded[skinExports[options.skin]];
  if (!Skin) throw new Error(`Skin module \`${key}\` did not export \`${skinExports[options.skin]}\`.`);

  return Skin;
}
