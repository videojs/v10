import type { Skin, Styling } from '@app/types';
import type { AudioSkinProps } from '@videojs/react/audio';
import type { VideoSkinProps } from '@videojs/react/video';
import type { ComponentType } from 'react';
import { createElement, useEffect, useState } from 'react';

type GeneratedVideoSkinProps = Omit<VideoSkinProps, 'renderPoster'> & {
  poster?: VideoSkinProps['renderPoster'];
};

function adaptTailwindVideoSkin(Component: ComponentType<GeneratedVideoSkinProps>): ComponentType<VideoSkinProps> {
  return function SandboxTailwindVideoSkin({ renderPoster, ...props }) {
    return <Component poster={renderPoster} {...props} />;
  };
}

async function loadTailwindVideoSkin(skin: Skin, live: boolean): Promise<ComponentType<VideoSkinProps>> {
  if (live) {
    if (skin === 'default') {
      const { DefaultLiveVideoSkin } = await import('@app/_generated/components/videojs/skins/live-video/skin');

      return adaptTailwindVideoSkin(DefaultLiveVideoSkin);
    }

    const { MinimalLiveVideoSkin } = await import('@app/_generated/components/videojs/skins/live-video-minimal/skin');

    return adaptTailwindVideoSkin(MinimalLiveVideoSkin);
  }

  if (skin === 'default') {
    const { DefaultVideoSkin } = await import('@app/_generated/components/videojs/skins/video/skin');

    return adaptTailwindVideoSkin(DefaultVideoSkin);
  }

  const { MinimalVideoSkin } = await import('@app/_generated/components/videojs/skins/video-minimal/skin');

  return adaptTailwindVideoSkin(MinimalVideoSkin);
}

async function loadVideoSkinComponent(
  skin: Skin,
  styling: Styling,
  live: boolean
): Promise<ComponentType<VideoSkinProps>> {
  if (styling === 'tailwind') return loadTailwindVideoSkin(skin, live);

  if (live) {
    const module = await import('@videojs/react/live-video');

    if (skin === 'default') {
      await import('@videojs/react/live-video/skin.css');
      return module.LiveVideoSkin;
    }

    await import('@videojs/react/live-video/minimal-skin.css');
    return module.MinimalLiveVideoSkin;
  }

  const module = await import('@videojs/react/video');

  if (skin === 'default') {
    await import('@videojs/react/video/skin.css');
    return module.VideoSkin;
  }

  await import('@videojs/react/video/minimal-skin.css');
  return module.MinimalVideoSkin;
}

async function loadAudioSkinComponent(
  skin: Skin,
  styling: Styling,
  live: boolean
): Promise<ComponentType<AudioSkinProps>> {
  if (styling === 'tailwind') {
    if (live) {
      if (skin === 'default') {
        const { DefaultLiveAudioSkin } = await import('@app/_generated/components/videojs/skins/live-audio/skin');

        return DefaultLiveAudioSkin;
      }

      const { MinimalLiveAudioSkin } = await import('@app/_generated/components/videojs/skins/live-audio-minimal/skin');

      return MinimalLiveAudioSkin;
    }

    if (skin === 'default') {
      const { DefaultAudioSkin } = await import('@app/_generated/components/videojs/skins/audio/skin');

      return DefaultAudioSkin;
    }

    const { MinimalAudioSkin } = await import('@app/_generated/components/videojs/skins/audio-minimal/skin');

    return MinimalAudioSkin;
  }

  if (live) {
    const module = await import('@videojs/react/live-audio');

    if (skin === 'default') {
      await import('@videojs/react/live-audio/skin.css');
      return module.LiveAudioSkin;
    }

    await import('@videojs/react/live-audio/minimal-skin.css');
    return module.MinimalLiveAudioSkin;
  }

  const module = await import('@videojs/react/audio');

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
    // we're proxying the deps
    // oxlint-disable-next-line react/exhaustive-deps
  }, deps);

  return component;
}

type VideoSkinComponentProps = { skin: Skin; styling: Styling; live?: boolean } & VideoSkinProps;

/** Loads the video skin for the given skin/styling. When `live` is true, the `live-video` skin variant is used instead. */
export function VideoSkinComponent({ skin, styling, live = false, ...props }: VideoSkinComponentProps) {
  const Component = useLoadedComponent(() => loadVideoSkinComponent(skin, styling, live), [skin, styling, live]);
  if (!Component) return null;

  return createElement(Component, props);
}

type AudioSkinComponentProps = { skin: Skin; styling: Styling; live?: boolean } & AudioSkinProps;

export function AudioSkinComponent({ skin, styling, live = false, ...props }: AudioSkinComponentProps) {
  const Component = useLoadedComponent(() => loadAudioSkinComponent(skin, styling, live), [skin, styling, live]);
  if (!Component) return null;

  return createElement(Component, props);
}
