import type { MediaFull, MediaFullEvents } from '@videojs/media';
import { useEffect } from 'react';

/**
 * A timed marker: a time in seconds plus any JSON-serializable payload.
 *
 * Cue points are not a player feature — they are ordinary `metadata` text track
 * cues. The demo declares a `<track kind="metadata">` element and adds
 * {@linkcode VTTCue}s to it, which is all a cue point is.
 */
export interface CuePoint {
  time: number;
  value: unknown;
}

/** Label on the demo's cue point `<track>`, used to find it again in `media.textTracks`. */
export const CUE_POINT_TRACK_LABEL = 'Cue points';

/** Length of the trailing cue while the media duration is still unknown. */
const TRAILING_CUE_LENGTH = 1;

// Playback engines clear text track cues while loading a source (hls.js does it
// on media attach and on every manifest load), so the cues are rewritten on each
// event that can follow such a wipe — including a failed load.
const REWRITE_EVENTS = [
  'emptied',
  'loadstart',
  'loadedmetadata',
  'durationchange',
  'error',
] as const satisfies readonly (keyof MediaFullEvents)[];

/** Cue text is JSON, so anything that survives `JSON.stringify` round-trips. */
function parseValue(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toCuePoint(cue: TextTrackCue): CuePoint {
  return { time: cue.startTime, value: parseValue((cue as VTTCue).text) };
}

/** Read the cue points currently on a metadata text track. */
export function readCuePoints(track: TextTrack | null): CuePoint[] {
  return track?.cues ? Array.from(track.cues, toCuePoint) : [];
}

/** Find the metadata text track carrying the demo's cue points. */
export function findCuePointTrack(media: MediaFull | null): TextTrack | null {
  const list = media?.textTracks;
  if (!list) return null;
  for (let i = 0; i < list.length; i++) {
    const track = list[i]!;
    if (track.kind === 'metadata' && track.label === CUE_POINT_TRACK_LABEL) {
      return track as unknown as TextTrack;
    }
  }
  return null;
}

/**
 * Rewrite the track's cues from `cuePoints`. Each cue runs until the next one
 * starts (the last until the end of the media) so exactly one is ever active.
 */
function writeCues(track: TextTrack, cuePoints: CuePoint[], duration: number): void {
  for (const cue of Array.from(track.cues ?? [])) track.removeCue(cue);

  const sorted = [...cuePoints].sort((a, b) => a.time - b.time);
  sorted.forEach((cuePoint, index) => {
    const next = sorted[index + 1];
    const end = Number.isFinite(duration) && duration > cuePoint.time ? duration : cuePoint.time + TRAILING_CUE_LENGTH;
    track.addCue(new VTTCue(cuePoint.time, next ? next.time : end, JSON.stringify(cuePoint.value)));
  });
}

/**
 * Mirror `cuePoints` onto a `<track kind="metadata">` element and report the
 * active cue point on every `cuechange`.
 *
 * The React list is the source of truth: the cues are (re)written whenever the
 * media loads, changes duration, or fails, since the playback engine clears them
 * along the way.
 */
export function useCuePointTrack({
  media,
  trackEl,
  cuePoints,
  onActiveChange,
}: {
  media: MediaFull | null;
  trackEl: HTMLTrackElement | null;
  cuePoints: CuePoint[];
  onActiveChange: (cuePoint: CuePoint | null) => void;
}): void {
  useEffect(() => {
    if (!trackEl) return;

    const track = trackEl.track;
    // `hidden` keeps the cues out of the caption region while still firing
    // `cuechange`; `disabled` would drop the cues entirely.
    track.mode = 'hidden';

    const controller = new AbortController();
    const { signal } = controller;
    const write = () => writeCues(track, cuePoints, media?.duration ?? Number.NaN);

    track.addEventListener(
      'cuechange',
      () => {
        const [active] = Array.from(track.activeCues ?? []);
        onActiveChange(active ? toCuePoint(active) : null);
      },
      { signal }
    );

    if (media) {
      for (const type of REWRITE_EVENTS) media.addEventListener(type, write, { signal });
    }

    write();

    return () => controller.abort();
  }, [media, trackEl, cuePoints, onActiveChange]);
}
