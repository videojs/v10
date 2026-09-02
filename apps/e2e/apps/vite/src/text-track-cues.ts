import { createTextTrack, type TextTrackHandle } from '@videojs/html';

import { MEDIA } from './resources';

interface TextTrackCuesResult {
  reason: 'cuechange' | 'timeout';
  mode: string;
  cues: number;
  activeCues: number;
  trackCount: number;
}

declare global {
  interface Window {
    textTrackCuesResult: TextTrackCuesResult | undefined;
    textTrackCuesHandle: TextTrackHandle;
  }
}

const video = document.querySelector('video');
if (!video) throw new Error('Video element was not found');

const handle = createTextTrack(video, { kind: 'metadata', label: 'e2e' });
if (!handle) throw new Error('Text track could not be created');

window.textTrackCuesHandle = handle;

// SAFETY: the track was created on a native video element, so it is a real TextTrack that dispatches events.
const track = handle.track as TextTrack;

{
  const resolve = (result: TextTrackCuesResult) => {
    window.textTrackCuesResult = result;
  };
  const report = (reason: TextTrackCuesResult['reason']): TextTrackCuesResult => ({
    reason,
    mode: track.mode,
    cues: track.cues?.length ?? 0,
    activeCues: track.activeCues?.length ?? 0,
    trackCount: video.textTracks.length,
  });
  const timeout = setTimeout(() => resolve(report('timeout')), 20_000);

  track.addEventListener(
    'cuechange',
    () => {
      clearTimeout(timeout);
      resolve(report('cuechange'));
    },
    { once: true }
  );

  handle.addCue(new VTTCue(0, 2, 'midroll'));

  video.addEventListener(
    'loadedmetadata',
    async () => {
      // The handle defers the cue until the src-less track settles; wait for it, then seek into the cue so the
      // time-marches-on steps run and activate it on the hidden track.
      while ((track.cues?.length ?? 0) === 0) await new Promise((resolve) => setTimeout(resolve, 50));

      video.currentTime = 1;
    },
    { once: true }
  );
}

video.src = MEDIA.mp4.url;
