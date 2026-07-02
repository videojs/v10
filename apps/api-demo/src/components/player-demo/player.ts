import type { AudioTrackListLike, Video, VideoRenditionListLike } from '@videojs/core';
import { createPlayer, videoFeatures } from '@videojs/react';

export const Player = createPlayer({ features: videoFeatures });

// Audio tracks and video renditions are only exposed once the hls.js engine attaches.
// Fullscreen / picture-in-picture live on the video media surface.
export type TracksMedia = Video & {
  readonly audioTracks?: AudioTrackListLike;
  readonly videoRenditions?: VideoRenditionListLike;
};
