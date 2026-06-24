import { describe, expect, it } from 'vitest';
import { MEDIA_PLAYLIST_METADATA_KEY, type ResolvedTrack } from '../../types';
import { liveLatencyFor, mediaPlaylistReloadDelay } from '../reload-policy';

/** Minimal resolved-track stand-in carrying only what the policy reads. */
function track(opts: {
  duration?: number;
  targetDuration?: number;
  mediaSequence?: number;
  segments?: number;
}): ResolvedTrack {
  return {
    duration: opts.duration ?? Number.POSITIVE_INFINITY,
    segments: Array.from({ length: opts.segments ?? 1 }),
    metadata: {
      [MEDIA_PLAYLIST_METADATA_KEY]: {
        targetDuration: opts.targetDuration ?? 4,
        mediaSequence: opts.mediaSequence ?? 0,
        endList: Number.isFinite(opts.duration ?? Number.POSITIVE_INFINITY),
      },
    },
  } as unknown as ResolvedTrack;
}

describe('mediaPlaylistReloadDelay', () => {
  it('stops (null) once the playlist is complete (finite duration)', () => {
    expect(mediaPlaylistReloadDelay(track({ duration: 30 }), undefined)).toBeNull();
  });

  it('polls at full target duration on the first reload of a live window', () => {
    expect(mediaPlaylistReloadDelay(track({ targetDuration: 4 }), undefined)).toBe(4000);
  });

  it('polls at half target duration when the window is unchanged', () => {
    const prev = track({ targetDuration: 4, mediaSequence: 10, segments: 3 });
    const same = track({ targetDuration: 4, mediaSequence: 10, segments: 3 });
    expect(mediaPlaylistReloadDelay(same, prev)).toBe(2000);
  });

  it('polls at full target duration when the window slid or grew', () => {
    const prev = track({ targetDuration: 4, mediaSequence: 10, segments: 3 });
    const slid = track({ targetDuration: 4, mediaSequence: 11, segments: 3 });
    expect(mediaPlaylistReloadDelay(slid, prev)).toBe(4000);
  });

  it('falls back to 6s when the playlist carries no usable target duration', () => {
    expect(mediaPlaylistReloadDelay(track({ targetDuration: 0 }), undefined)).toBe(6000);
  });
});

describe('liveLatencyFor', () => {
  it('is 3× the target duration (default HOLD-BACK)', () => {
    expect(liveLatencyFor(track({ targetDuration: 2 }))).toBe(6);
    expect(liveLatencyFor(track({ targetDuration: 4 }))).toBe(12);
  });

  it('falls back to 3× the 6s default when no usable target duration is declared', () => {
    expect(liveLatencyFor(track({ targetDuration: 0 }))).toBe(18);
  });
});
