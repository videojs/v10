/**
 * Parse a VTT segment using browser's native parser.
 *
 * Creates a dummy video element with a track element to leverage
 * the browser's optimized VTT parsing. Returns parsed VTTCue objects.
 */

// Singleton dummy video (reused across all parsing)
let dummyVideo: HTMLVideoElement | null = null;

function ensureDummyVideo(): HTMLVideoElement {
  if (!dummyVideo) {
    dummyVideo = document.createElement('video');
    dummyVideo.muted = true;
    dummyVideo.preload = 'none';
    dummyVideo.style.display = 'none';
    dummyVideo.crossOrigin = 'anonymous';
  }
  return dummyVideo;
}

export function parseVttSegment(url: string): Promise<VTTCue[]> {
  const video = ensureDummyVideo();
  const track = document.createElement('track');
  track.kind = 'subtitles';
  track.default = true;

  return new Promise((resolve, reject) => {
    const onLoad = (): void => {
      const cues: VTTCue[] = [];
      const textTrack = track.track;

      if (textTrack.cues) {
        for (let i = 0; i < textTrack.cues.length; i++) {
          const cue = textTrack.cues[i];
          if (cue) {
            cues.push(cue as VTTCue);
          }
        }
      }

      cleanup();
      resolve(cues);
    };

    const onError = (): void => {
      cleanup();
      reject(new Error(`Failed to load VTT segment: ${url}`));
    };

    const cleanup = (): void => {
      track.removeEventListener('load', onLoad);
      track.removeEventListener('error', onError);
      video.removeChild(track);
    };

    track.addEventListener('load', onLoad);
    track.addEventListener('error', onError);
    video.appendChild(track);
    track.src = url;
  });
}

export function destroyVttParser(): void {
  dummyVideo = null;
}
