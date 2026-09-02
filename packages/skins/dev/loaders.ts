import { skinCatalog, skinCatalogEntry } from '../build/catalog.ts';
import type { Framework, PreviewOptions, SkinName, StyleMode } from './options';

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
} as const satisfies Record<`${Framework}/${SkinName}/${StyleMode}`, () => Promise<SkinModule>>;

type ModuleKey = keyof typeof modules;

/** Generated package entry points, so the playground can hold each packaged skin against its authored source. */
const packaged = {
  'default-video': {
    html: () => import('../../html/src/define/video/skin.ts'),
    react: () => import('../../react/src/presets/video/skin.tsx'),
    reactStyles: () => import('../../react/src/presets/video/skin.css'),
  },
  'minimal-video': {
    html: () => import('../../html/src/define/video/minimal-skin.ts'),
    react: () => import('../../react/src/presets/video/minimal-skin.tsx'),
    reactStyles: () => import('../../react/src/presets/video/minimal-skin.css'),
  },
  'default-live-video': {
    html: () => import('../../html/src/define/live-video/skin.ts'),
    react: () => import('../../react/src/presets/live-video/skin.tsx'),
    reactStyles: () => import('../../react/src/presets/live-video/skin.css'),
  },
  'minimal-live-video': {
    html: () => import('../../html/src/define/live-video/minimal-skin.ts'),
    react: () => import('../../react/src/presets/live-video/minimal-skin.tsx'),
    reactStyles: () => import('../../react/src/presets/live-video/minimal-skin.css'),
  },
  'default-live-audio': {
    html: () => import('../../html/src/define/live-audio/skin.ts'),
    react: () => import('../../react/src/presets/live-audio/skin.tsx'),
    reactStyles: () => import('../../react/src/presets/live-audio/skin.css'),
  },
  'minimal-live-audio': {
    html: () => import('../../html/src/define/live-audio/minimal-skin.ts'),
    react: () => import('../../react/src/presets/live-audio/minimal-skin.tsx'),
    reactStyles: () => import('../../react/src/presets/live-audio/minimal-skin.css'),
  },
  'default-audio': {
    html: () => import('../../html/src/define/audio/skin.ts'),
    react: () => import('../../react/src/presets/audio/skin.tsx'),
    reactStyles: () => import('../../react/src/presets/audio/skin.css'),
  },
  'minimal-audio': {
    html: () => import('../../html/src/define/audio/minimal-skin.ts'),
    react: () => import('../../react/src/presets/audio/minimal-skin.tsx'),
    reactStyles: () => import('../../react/src/presets/audio/minimal-skin.css'),
  },
} as const satisfies Record<
  SkinName,
  { html: () => Promise<object>; react: () => Promise<SkinModule>; reactStyles: () => Promise<object> }
>;

// SAFETY: the catalog lists every skin name exactly once, so the entries cover the full `SkinName` key set.
const skinExports = Object.fromEntries(skinCatalog.map((entry) => [entry.name, entry.exportName])) as Record<
  SkinName,
  string
>;

type SkinModule = Partial<Record<string, PreviewSkin>>;

/** Load one statically discoverable authored Skin transform, or the packaged skin the framework package ships. */
export async function loadSkin(options: PreviewOptions): Promise<PreviewSkin> {
  if (options.source === 'generated') return loadPackagedSkin(options);

  const key: ModuleKey = `${options.framework}/${options.skin}/${options.styleMode}`;
  // SAFETY: every static module is transformed to the framework-specific Skin export selected below.
  const loaded = (await modules[key]()) as SkinModule;
  const Skin = loaded[skinExports[options.skin]];
  if (!Skin) throw new Error(`Skin module \`${key}\` did not export \`${skinExports[options.skin]}\`.`);

  return Skin;
}

async function loadPackagedSkin(options: PreviewOptions): Promise<PreviewSkin> {
  const entry = skinCatalogEntry(options.skin);
  const modules = packaged[options.skin];

  if (options.framework === 'html') {
    await modules.html();

    // The packaged custom element stamps its own template, so the preview only needs the host and the media slot.
    return ({ className = '' } = {}) => ({
      toString: () => `<${entry.tags.css} class="${className}"><slot></slot></${entry.tags.css}>`,
    });
  }

  const [loaded] = await Promise.all([modules.react(), modules.reactStyles()]);
  // SAFETY: every packaged preset module exports the catalog's `component` as a React skin component.
  const Skin = (loaded as SkinModule)[entry.component];
  if (!Skin) throw new Error(`Packaged skin \`${options.skin}\` did not export \`${entry.component}\`.`);

  return Skin;
}
