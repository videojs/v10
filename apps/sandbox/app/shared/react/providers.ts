import { createPlayer } from '@videojs/react';
import { audioFeatures } from '@videojs/react/audio';
import { backgroundFeatures } from '@videojs/react/background';
import { videoFeatures } from '@videojs/react/video';

// The `live-video` preset currently shares `videoFeatures`, so the same provider
// works for both live and VOD playback — only the skin swaps on the source.
export const { Provider: VideoProvider } = createPlayer({
  features: videoFeatures,
});

export const { Provider: AudioProvider } = createPlayer({
  features: audioFeatures,
});

export const { Provider: BackgroundVideoProvider } = createPlayer({
  features: backgroundFeatures,
});
