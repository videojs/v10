import { describe, expect, it } from 'vitest';
import { shouldForceEnded } from '../recover-end-stall';

// At the end-of-stream freeze: MediaSource ended, finite duration, actively playing,
// and the playhead a few frames short of the reachable (intersection) buffered end.
const atEndStall = {
  msEnded: true,
  durationFinite: true,
  paused: false,
  seeking: false,
  ended: false,
  currentTime: 599.95,
  bufferedEnd: 600.0,
} as const;

const WINDOW = 0.2;

describe('shouldForceEnded', () => {
  it('fires at the end-of-stream freeze (playhead within the window of the buffered end)', () => {
    expect(shouldForceEnded(atEndStall, WINDOW)).toBe(true); // gap 0.05 < 0.2
  });

  it('does not fire mid-content (playhead far from the buffered end)', () => {
    expect(shouldForceEnded({ ...atEndStall, currentTime: 300, bufferedEnd: 600 }, WINDOW)).toBe(false);
  });

  it('does not fire until endOfStream is signalled', () => {
    expect(shouldForceEnded({ ...atEndStall, msEnded: false }, WINDOW)).toBe(false);
  });

  it('does not fire for live (non-finite duration)', () => {
    expect(shouldForceEnded({ ...atEndStall, durationFinite: false }, WINDOW)).toBe(false);
  });

  it('does not fire while paused, seeking, or already ended', () => {
    expect(shouldForceEnded({ ...atEndStall, paused: true }, WINDOW)).toBe(false);
    expect(shouldForceEnded({ ...atEndStall, seeking: true }, WINDOW)).toBe(false);
    expect(shouldForceEnded({ ...atEndStall, ended: true }, WINDOW)).toBe(false);
  });

  it('does not fire with no buffered ranges', () => {
    expect(shouldForceEnded({ ...atEndStall, bufferedEnd: undefined }, WINDOW)).toBe(false);
  });

  it('respects the configured window', () => {
    const gap015 = { ...atEndStall, currentTime: 599.85, bufferedEnd: 600.0 }; // gap 0.15
    expect(shouldForceEnded(gap015, 0.2)).toBe(true);
    expect(shouldForceEnded(gap015, 0.1)).toBe(false);
  });
});
