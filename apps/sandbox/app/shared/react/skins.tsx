import { PLAYER_FRAME_CLASSES } from '@app/shared/player-frame';
import type { Skin, SkinSource, Styling } from '@app/types';
import type { AudioSkinProps } from '@videojs/react/audio';
import type { VideoSkinProps } from '@videojs/react/video';
import type { ComponentType } from 'react';
import { createElement, useEffect, useState } from 'react';

import { useDirection } from './use-direction';
import { useSandbox } from './use-sandbox';

type SkinPreset = 'video' | 'audio' | 'live-video' | 'live-audio';
type SkinKey = `${SkinPreset}/${Skin}`;
type Loader = () => Promise<object>;

interface SkinRequest {
  readonly preset: SkinPreset;
  readonly skin: Skin;
  readonly styling: Styling;
  readonly source: SkinSource;
}

/** One module per preset in `@videojs/react`, exporting both skins, with a stylesheet per skin beside it. */
const packageSkins: Record<
  SkinPreset,
  { module: Loader; styles: Record<Skin, Loader>; components: Record<Skin, string> }
> = {
  video: {
    module: () => import('@videojs/react/video'),
    styles: {
      default: () => import('@videojs/react/video/skin.css'),
      minimal: () => import('@videojs/react/video/minimal-skin.css'),
    },
    components: { default: 'VideoSkin', minimal: 'MinimalVideoSkin' },
  },
  'live-video': {
    module: () => import('@videojs/react/live-video'),
    styles: {
      default: () => import('@videojs/react/live-video/skin.css'),
      minimal: () => import('@videojs/react/live-video/minimal-skin.css'),
    },
    components: { default: 'LiveVideoSkin', minimal: 'MinimalLiveVideoSkin' },
  },
  audio: {
    module: () => import('@videojs/react/audio'),
    styles: {
      default: () => import('@videojs/react/audio/skin.css'),
      minimal: () => import('@videojs/react/audio/minimal-skin.css'),
    },
    components: { default: 'AudioSkin', minimal: 'MinimalAudioSkin' },
  },
  'live-audio': {
    module: () => import('@videojs/react/live-audio'),
    styles: {
      default: () => import('@videojs/react/live-audio/skin.css'),
      minimal: () => import('@videojs/react/live-audio/minimal-skin.css'),
    },
    components: { default: 'LiveAudioSkin', minimal: 'MinimalLiveAudioSkin' },
  },
};

/**
 * The registry installs: the Tailwind catalog under `@`, the CSS catalog under `@css`. Both use the catalog's export
 * names.
 */
const registrySkins: Record<Styling, Record<SkinKey, Loader>> = {
  tailwind: {
    'video/default': () => import('@app/_generated/components/videojs/skins/video/skin'),
    'video/minimal': () => import('@app/_generated/components/videojs/skins/video/minimal/skin'),
    'live-video/default': () => import('@app/_generated/components/videojs/skins/live-video/skin'),
    'live-video/minimal': () => import('@app/_generated/components/videojs/skins/live-video/minimal/skin'),
    'audio/default': () => import('@app/_generated/components/videojs/skins/audio/skin'),
    'audio/minimal': () => import('@app/_generated/components/videojs/skins/audio/minimal/skin'),
    'live-audio/default': () => import('@app/_generated/components/videojs/skins/live-audio/skin'),
    'live-audio/minimal': () => import('@app/_generated/components/videojs/skins/live-audio/minimal/skin'),
  },
  css: {
    'video/default': () => import('@css/components/videojs/skins/video/skin'),
    'video/minimal': () => import('@css/components/videojs/skins/video/minimal/skin'),
    'live-video/default': () => import('@css/components/videojs/skins/live-video/skin'),
    'live-video/minimal': () => import('@css/components/videojs/skins/live-video/minimal/skin'),
    'audio/default': () => import('@css/components/videojs/skins/audio/skin'),
    'audio/minimal': () => import('@css/components/videojs/skins/audio/minimal/skin'),
    'live-audio/default': () => import('@css/components/videojs/skins/live-audio/skin'),
    'live-audio/minimal': () => import('@css/components/videojs/skins/live-audio/minimal/skin'),
  },
};

const registryComponents: Record<SkinKey, string> = {
  'video/default': 'DefaultVideoSkin',
  'video/minimal': 'MinimalVideoSkin',
  'live-video/default': 'DefaultLiveVideoSkin',
  'live-video/minimal': 'MinimalLiveVideoSkin',
  'audio/default': 'DefaultAudioSkin',
  'audio/minimal': 'MinimalAudioSkin',
  'live-audio/default': 'DefaultLiveAudioSkin',
  'live-audio/minimal': 'MinimalLiveAudioSkin',
};

function pickComponent<Props>(module: object, name: string, key: string): ComponentType<Props> {
  // SAFETY: a module namespace is a plain object keyed by export name; the value is checked below.
  const component = (module as Record<string, unknown>)[name];
  if (typeof component !== 'function') throw new Error(`Skin module ${key} did not export ${name}.`);

  // SAFETY: a skin module exports its skin as a React component under the catalogued name.
  return component as ComponentType<Props>;
}

async function loadSkinComponent<Props>(request: SkinRequest): Promise<ComponentType<Props>> {
  const { preset, skin, styling, source } = request;
  const key: SkinKey = `${preset}/${skin}`;

  switch (source) {
    case 'package': {
      const entry = packageSkins[preset];
      const [module] = await Promise.all([entry.module(), entry.styles[skin]()]);

      return pickComponent(module, entry.components[skin], key);
    }
    case 'registry':
      return pickComponent(await registrySkins[styling][key](), registryComponents[key], key);
    case 'authored':
      throw new Error('Authored skins are compiled from the workspace; see `authored-skins.ts`.');
  }
}

function useLoadedComponent<Props>(
  load: () => Promise<ComponentType<Props>>,
  deps: readonly unknown[]
): ComponentType<Props> | null {
  const [component, setComponent] = useState<ComponentType<Props> | null>(null);

  useEffect(() => {
    let active = true;

    void load()
      .then((resolved) => {
        if (!active) return;

        setComponent(() => resolved);
      })
      .catch((error) => {
        if (!active) return;

        // The component stays null; the page shows nothing rather than a half-styled player.
        console.error('Failed to load skin', error);
      });

    return () => {
      active = false;
    };
    // we're proxying the deps
    // oxlint-disable-next-line react/exhaustive-deps
  }, deps);

  return component;
}

/** The skin derives `dir` from its locale unless given one, so a pinned direction has to arrive as a prop. */
function useDirectionProps(): { dir?: 'ltr' | 'rtl' } {
  const direction = useDirection();

  return direction === 'auto' ? {} : { dir: direction };
}

type VideoSkinComponentProps = { live?: boolean } & VideoSkinProps;

/**
 * Loads the video skin the shell selected, from the source it selected, framed the way every sandbox page frames a
 * player unless a `className` says otherwise. When `live` is true, the `live-video` skin variant is used instead.
 */
export function VideoSkinComponent({
  live = false,
  className = PLAYER_FRAME_CLASSES.video,
  ...props
}: VideoSkinComponentProps) {
  const { skin, styling, skins } = useSandbox();
  const preset: SkinPreset = live ? 'live-video' : 'video';
  const Component = useLoadedComponent<VideoSkinProps>(
    () => loadSkinComponent({ preset, skin, styling, source: skins }),
    [preset, skin, styling, skins]
  );
  const directionProps = useDirectionProps();

  if (!Component) return null;

  return createElement(Component, { ...props, ...directionProps, className });
}

type AudioSkinComponentProps = { live?: boolean } & AudioSkinProps;

export function AudioSkinComponent({
  live = false,
  className = PLAYER_FRAME_CLASSES.audio,
  ...props
}: AudioSkinComponentProps) {
  const { skin, styling, skins } = useSandbox();
  const preset: SkinPreset = live ? 'live-audio' : 'audio';
  const Component = useLoadedComponent<AudioSkinProps>(
    () => loadSkinComponent({ preset, skin, styling, source: skins }),
    [preset, skin, styling, skins]
  );
  const directionProps = useDirectionProps();

  if (!Component) return null;

  return createElement(Component, { ...props, ...directionProps, className });
}
