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

    setComponent(null);

    void load().then((resolved) => {
      if (!active) return;

      setComponent(() => resolved);
    });

    return () => {
      active = false;
    };
  }, deps);

  return component;
}

type VideoSkinComponentProps = { skin: Skin; styling: Styling } & VideoSkinProps;

export function VideoSkinComponent({ skin, styling, ...props }: VideoSkinComponentProps) {
  const Component = useLoadedComponent(() => loadVideoSkinComponent(skin, styling), [skin, styling]);

  if (!Component) return null;

  return <Component {...props} />;
}

type AudioSkinComponentProps = { skin: Skin; styling: Styling } & AudioSkinProps;

export function AudioSkinComponent({ skin, styling, ...props }: AudioSkinComponentProps) {
  const Component = useLoadedComponent(() => loadAudioSkinComponent(skin, styling), [skin, styling]);

  if (!Component) return null;

  return <Component {...props} />;
}
