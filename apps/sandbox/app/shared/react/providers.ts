import { createPlayer } from '@videojs/react';
import { audioFeatures } from '@videojs/react/audio';
import { backgroundFeatures } from '@videojs/react/background';
import { liveAudioFeatures } from '@videojs/react/live-audio';
import { liveVideoFeatures } from '@videojs/react/live-video';
import { videoFeatures } from '@videojs/react/video';

export const { Provider: VideoProvider } = createPlayer({
  features: videoFeatures,
});

export const { Provider: AudioProvider } = createPlayer({
  features: audioFeatures,
});

export const { Provider: BackgroundVideoProvider } = createPlayer({
  features: backgroundFeatures,
});

// Live providers register `liveFeature` so the LiveButton can read
// `liveEdgeStart` / `targetLiveWindow` and seek to the live edge.
export const { Provider: LiveVideoProvider } = createPlayer({
  features: liveVideoFeatures,
});

// Live DVR reuses the live feature set — `liveVideoFeatures` already includes
// `timeFeature` and `bufferFeature`, which the DVR skin's time slider and time
// displays read to scrub within the seekable DVR window.
export const { Provider: LiveDvrVideoProvider } = createPlayer({
  features: liveVideoFeatures,
});

export const { Provider: LiveAudioProvider } = createPlayer({
  features: liveAudioFeatures,
});
