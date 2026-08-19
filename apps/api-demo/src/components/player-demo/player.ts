import type { AudioTrackListLike, Video, VideoRenditionListLike } from '@videojs/media';
import { createPlayer } from '@videojs/react';
import { videoFeatures } from '@videojs/react/video';

export const Player = createPlayer({ features: videoFeatures });

// Audio tracks and video renditions are only exposed once the hls.js engine attaches.
// Fullscreen / picture-in-picture live on the video media surface.
export type TracksMedia = Video & {
  readonly audioTracks?: AudioTrackListLike;
  readonly videoRenditions?: VideoRenditionListLike;
};
