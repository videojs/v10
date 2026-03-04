import { AudioSkin, MinimalAudioSkin } from '@videojs/react/audio';
import type { VideoSkinProps } from '@videojs/react/video';
import { MinimalVideoSkin, VideoSkin } from '@videojs/react/video';
import type { Skin } from '../types';

export function VideoSkinComponent({ skin, ...props }: { skin: Skin } & VideoSkinProps) {
  switch (skin) {
    case 'default':
      return <VideoSkin {...props} />;
    case 'minimal':
      return <MinimalVideoSkin {...props} />;
  }
}

export function AudioSkinComponent({ skin, ...props }: { skin: Skin } & VideoSkinProps) {
  switch (skin) {
    case 'default':
      return <AudioSkin {...props} />;
    case 'minimal':
      return <MinimalAudioSkin {...props} />;
  }
}
