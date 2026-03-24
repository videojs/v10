import type { LevelDetails } from 'hls.js';

export type StreamType = 'on-demand' | 'live' | 'unknown';

export interface StreamInfo {
  streamType: StreamType;
  /** NaN for on-demand; 0 for sliding-window live; Infinity for DVR/EVENT. */
  targetLiveWindow: number;
  /** Seconds behind live edge at which playback should start. NaN for on-demand. */
  liveEdgeOffset: number;
}

export function getStreamInfoFromLevelDetails(details: LevelDetails): StreamInfo {
  if (!details.live) {
    return { streamType: 'on-demand', targetLiveWindow: NaN, liveEdgeOffset: NaN };
  }

  const liveEdgeOffset =
    details.partTarget > 0
      ? details.partTarget * 2 // LL-HLS: two part targets behind edge
      : details.targetduration * 3; // regular live: three target durations behind edge

  // EVENT playlists accumulate segments — full window is seekable (DVR).
  if (details.type === 'EVENT') {
    return { streamType: 'live', targetLiveWindow: Infinity, liveEdgeOffset };
  }

  // LIVE or null — sliding window, no DVR.
  return { streamType: 'live', targetLiveWindow: 0, liveEdgeOffset };
}
