import type { AudioSkinProps } from '@videojs/react/audio';
import { AudioSkin, AudioSkinTailwind, MinimalAudioSkin, MinimalAudioSkinTailwind } from '@videojs/react/audio';
import type { VideoSkinProps } from '@videojs/react/video';
import { MinimalVideoSkin, MinimalVideoSkinTailwind, VideoSkin, VideoSkinTailwind } from '@videojs/react/video';
import type { Skin, Styling } from '../../types';

type VideoSkinComponentProps = { skin: Skin; styling: Styling } & VideoSkinProps;

export function VideoSkinComponent({ skin, styling, ...props }: VideoSkinComponentProps) {
  if (styling === 'tailwind') {
    switch (skin) {
      case 'default':
        return <VideoSkinTailwind {...props} />;
      case 'minimal':
        return <MinimalVideoSkinTailwind {...props} />;
    }
  }

  switch (skin) {
    case 'default':
      return <VideoSkin {...props} />;
    case 'minimal':
      return <MinimalVideoSkin {...props} />;
  }
}

type AudioSkinComponentProps = { skin: Skin; styling: Styling } & AudioSkinProps;

export function AudioSkinComponent({ skin, styling, ...props }: AudioSkinComponentProps) {
  if (styling === 'tailwind') {
    switch (skin) {
      case 'default':
        return <AudioSkinTailwind {...props} />;
      case 'minimal':
        return <MinimalAudioSkinTailwind {...props} />;
    }
  }

  switch (skin) {
    case 'default':
      return <AudioSkin {...props} />;
    case 'minimal':
      return <MinimalAudioSkin {...props} />;
  }
}
