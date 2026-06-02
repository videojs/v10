import type { Skin, Styling } from '@app/types';
import type { AudioSkinProps } from '@videojs/react/audio';
import type { VideoSkinProps } from '@videojs/react/video';
import type { ComponentType } from 'react';
import { useEffect, useState } from 'react';

async function loadVideoSkinComponent(skin: Skin, styling: Styling): Promise<ComponentType<VideoSkinProps>> {
  const module = await import('@videojs/react/video');

  if (styling === 'tailwind') {
    return skin === 'default' ? module.VideoSkinTailwind : module.MinimalVideoSkinTailwind;
  }

  if (skin === 'default') {
    await import('@videojs/react/video/skin.css');
    return module.VideoSkin;
  }

  await import('@videojs/react/video/minimal-skin.css');
  return module.MinimalVideoSkin;
}

async function loadLiveVideoSkinComponent(skin: Skin, styling: Styling): Promise<ComponentType<VideoSkinProps>> {
  const module = await import('@videojs/react/live-video');

  if (styling === 'tailwind') {
    return skin === 'default' ? module.LiveVideoSkinTailwind : module.MinimalLiveVideoSkinTailwind;
  }

  if (skin === 'default') {
    await import('@videojs/react/live-video/skin.css');
    return module.LiveVideoSkin;
  }

  await import('@videojs/react/live-video/minimal-skin.css');
  return module.MinimalLiveVideoSkin;
}

async function loadLiveDvrSkinComponent(skin: Skin, styling: Styling): Promise<ComponentType<VideoSkinProps>> {
  const module = await import('./live-dvr');

  if (styling === 'tailwind') {
    return skin === 'default' ? module.LiveDvrSkinTailwind : module.MinimalLiveDvrSkinTailwind;
  }

  // The DVR skin reuses the shared live-video skin stylesheet — it includes the
  // time slider / time display styles the variant adds back in.
  if (skin === 'default') {
    await import('@videojs/react/live-video/skin.css');
    return module.LiveDvrSkin;
  }

  await import('@videojs/react/live-video/minimal-skin.css');
  return module.MinimalLiveDvrSkin;
}

async function loadAudioSkinComponent(skin: Skin, styling: Styling): Promise<ComponentType<AudioSkinProps>> {
  const module = await import('@videojs/react/audio');

  if (styling === 'tailwind') {
    return skin === 'default' ? module.AudioSkinTailwind : module.MinimalAudioSkinTailwind;
  }

  if (skin === 'default') {
    await import('@videojs/react/audio/skin.css');
    return module.AudioSkin;
  }

  await import('@videojs/react/audio/minimal-skin.css');
  return module.MinimalAudioSkin;
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
      .catch(() => {
        if (!active) return;
        // Intentionally ignore load errors to avoid unhandled promise rejections.
        // The component will remain null, and callers can handle absence as needed.
      });

    return () => {
      active = false;
    };
    // biome-ignore lint/correctness/useExhaustiveDependencies: we're proxying the deps
  }, deps);

  return component;
}

type VideoSkinComponentProps = { skin: Skin; styling: Styling; live?: boolean; dvr?: boolean } & VideoSkinProps;

/**
 * Loads the video skin for the given skin/styling. When `dvr` is true, the
 * sandbox-only live DVR skin variant is used; otherwise when `live` is true,
 * the `live-video` skin variant is used.
 */
export function VideoSkinComponent({ skin, styling, live = false, dvr = false, ...props }: VideoSkinComponentProps) {
  const Component = useLoadedComponent(() => {
    if (dvr) return loadLiveDvrSkinComponent(skin, styling);
    return live ? loadLiveVideoSkinComponent(skin, styling) : loadVideoSkinComponent(skin, styling);
  }, [skin, styling, live, dvr]);

  if (!Component) return null;

  return <Component {...props} />;
}

type AudioSkinComponentProps = { skin: Skin; styling: Styling } & AudioSkinProps;

export function AudioSkinComponent({ skin, styling, ...props }: AudioSkinComponentProps) {
  const Component = useLoadedComponent(() => loadAudioSkinComponent(skin, styling), [skin, styling]);

  if (!Component) return null;

  return <Component {...props} />;
}
