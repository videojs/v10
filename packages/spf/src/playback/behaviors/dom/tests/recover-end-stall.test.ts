import { describe, expect, it } from 'vite-plus/test';

import { signal } from '../../../../core/signals/primitives';
import { recoverEndStall, shouldForceEnded } from '../recover-end-stall';

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

function makeMediaElement(
  overrides: Partial<Pick<HTMLMediaElement, 'duration' | 'currentTime' | 'paused' | 'seeking' | 'ended'>> = {}
) {
  const mediaElement = document.createElement('video');
  const values = { duration: 600.044, currentTime: 599.95, paused: false, seeking: false, ended: false, ...overrides };

  for (const [key, value] of Object.entries(values)) {
    Object.defineProperty(mediaElement, key, { value, writable: true });
  }

  return mediaElement;
}

function makeEndedMediaSource(readyState: MediaSource['readyState'] = 'ended'): MediaSource {
  const sourceBuffers = [600.044, 600].map((end) => ({
    buffered: { length: 1, start: () => 0, end: () => end } as TimeRanges,
  }));

  return Object.assign(new EventTarget(), { readyState, sourceBuffers }) as unknown as MediaSource;
}

describe('recoverEndStall', () => {
  it.each([
    { name: 'nudges the end-of-stream freeze to duration', media: {}, readyState: 'ended' as const, nudge: true },
    { name: 'does not fire mid-content', media: { currentTime: 300 }, readyState: 'ended' as const, nudge: false },
    { name: 'does not fire until endOfStream is signalled', media: {}, readyState: 'open' as const, nudge: false },
    { name: 'does not fire for live', media: { duration: Infinity }, readyState: 'ended' as const, nudge: false },
    { name: 'does not fire while paused', media: { paused: true }, readyState: 'ended' as const, nudge: false },
    { name: 'does not fire while seeking', media: { seeking: true }, readyState: 'ended' as const, nudge: false },
    { name: 'does not fire when already ended', media: { ended: true }, readyState: 'ended' as const, nudge: false },
    {
      name: 'does not fire past the reachable A/V end',
      media: { currentTime: 600.01 },
      readyState: 'ended' as const,
      nudge: false,
    },
  ])('$name', ({ media, readyState, nudge }) => {
    const mediaElement = makeMediaElement(media);
    const initialTime = mediaElement.currentTime;
    const cleanup = recoverEndStall.setup({
      context: { mediaElement: signal(mediaElement), mediaSource: signal(makeEndedMediaSource(readyState)) },
    });

    try {
      mediaElement.dispatchEvent(new Event('waiting'));
      expect(mediaElement.currentTime).toBe(nudge ? 600.044 : initialTime);
    } finally {
      cleanup();
    }
  });

  it.each([
    { window: 0.2, expectedTime: 600.044 },
    { window: 0.1, expectedTime: 599.85 },
  ])('respects the configured window ($window seconds)', ({ window, expectedTime }) => {
    const mediaElement = makeMediaElement({ currentTime: 599.85 });
    const cleanup = recoverEndStall.setup({
      context: { mediaElement: signal(mediaElement), mediaSource: signal(makeEndedMediaSource()) },
      config: { endStallNudgeWindow: window },
    });

    try {
      mediaElement.dispatchEvent(new Event('waiting'));
      expect(mediaElement.currentTime).toBe(expectedTime);
    } finally {
      cleanup();
    }
  });

  it('does not fire without a MediaSource', () => {
    const mediaElement = makeMediaElement();
    const cleanup = recoverEndStall.setup({
      context: { mediaElement: signal(mediaElement), mediaSource: signal<MediaSource | undefined>(undefined) },
    });

    try {
      mediaElement.dispatchEvent(new Event('waiting'));
      expect(mediaElement.currentTime).toBe(599.95);
    } finally {
      cleanup();
    }
  });

  it('replaces the waiting listener with the media element and removes it on cleanup', async () => {
    const previous = makeMediaElement();
    const current = makeMediaElement();
    const mediaElement = signal<HTMLMediaElement | undefined>(previous);
    const cleanup = recoverEndStall.setup({
      context: { mediaElement, mediaSource: signal(makeEndedMediaSource()) },
    });

    try {
      previous.dispatchEvent(new Event('waiting'));
      expect(previous.currentTime).toBe(600.044);
      previous.currentTime = 599.95;

      mediaElement.set(current);
      await new Promise((resolve) => setTimeout(resolve, 0));
      previous.dispatchEvent(new Event('waiting'));
      expect(previous.currentTime).toBe(599.95);
      current.dispatchEvent(new Event('waiting'));
      expect(current.currentTime).toBe(600.044);
      current.currentTime = 599.95;

      cleanup();
      current.dispatchEvent(new Event('waiting'));
      expect(current.currentTime).toBe(599.95);
    } finally {
      cleanup();
    }
  });

  it('does not skip to duration on waiting with no buffered media', () => {
    const mediaElement = document.createElement('video');

    Object.defineProperties(mediaElement, {
      duration: { value: 60 },
      paused: { value: false },
      seeking: { value: false },
      ended: { value: false },
    });

    const mediaSource = new MediaSource();

    Object.defineProperty(mediaSource, 'readyState', { value: 'ended' });

    const cleanup = recoverEndStall.setup({
      context: { mediaElement: signal(mediaElement), mediaSource: signal(mediaSource) },
    });

    try {
      mediaElement.dispatchEvent(new Event('waiting'));
      expect(mediaElement.currentTime).toBe(0);
    } finally {
      cleanup();
    }
  });
});
