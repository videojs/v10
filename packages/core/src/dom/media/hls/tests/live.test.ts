import Hls from 'hls.js';
import { describe, expect, it, vi } from 'vitest';

import { HlsJsMediaLiveMixin } from '../live';
import type { HlsEngineHost } from '../types';

function createEngine(): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  return {
    on(event: string, fn: (...args: any[]) => void) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event)!.add(fn);
    },
    off(event: string, fn: (...args: any[]) => void) {
      listeners.get(event)?.delete(fn);
    },
    emit(event: string, ...args: any[]) {
      for (const fn of listeners.get(event) ?? []) fn(event, ...args);
    },
  } as unknown as Hls;
}

class FakeHost extends EventTarget implements HlsEngineHost {
  engine: Hls | null;
  target: HTMLMediaElement | null = null;

  constructor(engine: Hls | null = null) {
    super();
    this.engine = engine;
  }
}

const HlsJsMediaLive = HlsJsMediaLiveMixin(FakeHost);

// Minimal LevelDetails shape — only the fields the mixin reads.
function levelDetails(overrides: Record<string, unknown>) {
  return {
    live: false,
    type: null,
    partList: null,
    partHoldBack: 0,
    partTarget: 0,
    holdBack: 0,
    targetduration: 6,
    totalduration: 0,
    ...overrides,
  } as any;
}

function emitLevelLoaded(engine: Hls, details: unknown) {
  (engine as any).emit(Hls.Events.LEVEL_LOADED, { details });
}

function setTargetSeekable(host: { target: HTMLMediaElement | null }, ranges: [number, number][]) {
  const video = document.createElement('video');
  Object.defineProperty(video, 'seekable', {
    configurable: true,
    get() {
      return {
        length: ranges.length,
        start: (i: number) => ranges[i]?.[0] ?? 0,
        end: (i: number) => ranges[i]?.[1] ?? 0,
      } as TimeRanges;
    },
  });
  host.target = video;
  return video;
}

describe('HlsJsMediaLiveMixin', () => {
  describe('defaults', () => {
    it('starts with `NaN` for both values and no event', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
    });
  });

  describe('targetLiveWindow derivation', () => {
    it('is `0` for standard live', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);

      const handler = vi.fn();
      host.addEventListener('targetlivewindowchange', handler);

      emitLevelLoaded(engine, levelDetails({ live: true, type: null, holdBack: 18 }));

      expect(host.targetLiveWindow).toBe(0);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('is `Infinity` for an `EVENT` playlist (DVR)', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);

      emitLevelLoaded(engine, levelDetails({ live: true, type: 'EVENT', holdBack: 18 }));

      expect(host.targetLiveWindow).toBe(Number.POSITIVE_INFINITY);
    });

    it('is `NaN` for non-live playlists', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);

      emitLevelLoaded(engine, levelDetails({ live: false, type: 'VOD' }));

      expect(host.targetLiveWindow).toBeNaN();
    });

    it('dedupes `targetlivewindowchange` when the value does not change', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);

      const handler = vi.fn();
      host.addEventListener('targetlivewindowchange', handler);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));
      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));

      expect(handler).toHaveBeenCalledOnce();
    });
  });

  describe('liveEdgeStart derivation', () => {
    it('uses `holdBack` for standard live (`seekable.end - holdBack`)', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18, targetduration: 6 }));

      expect(host.liveEdgeStart).toBe(42);
    });

    it('falls back to `targetduration * 3` when `holdBack` is absent', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 0, targetduration: 6 }));

      expect(host.liveEdgeStart).toBe(42);
    });

    it('uses `partHoldBack` for low-latency live', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, partList: [{}], partHoldBack: 2, partTarget: 0.5 }));

      expect(host.liveEdgeStart).toBe(58);
    });

    it('falls back to `partTarget * 2` when `partHoldBack` is absent', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, partList: [{}], partHoldBack: 0, partTarget: 0.5 }));

      expect(host.liveEdgeStart).toBe(59);
    });

    it('is `NaN` when no seekable range is available', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, []);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));

      expect(host.liveEdgeStart).toBeNaN();
    });

    it('is `NaN` when the stream is not live', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: false, type: 'VOD' }));

      expect(host.liveEdgeStart).toBeNaN();
    });

    it('reflects the current `seekable` on every read', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);

      let end = 60;
      const video = document.createElement('video');
      Object.defineProperty(video, 'seekable', {
        configurable: true,
        get() {
          return {
            length: 1,
            start: () => 0,
            end: () => end,
          } as TimeRanges;
        },
      });
      host.target = video;

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));

      expect(host.liveEdgeStart).toBe(42);

      end = 120;
      expect(host.liveEdgeStart).toBe(102);
    });
  });

  describe('reset', () => {
    it('resets on `MANIFEST_LOADING`', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));
      expect(host.targetLiveWindow).toBe(0);

      const handler = vi.fn();
      host.addEventListener('targetlivewindowchange', handler);

      (engine as any).emit(Hls.Events.MANIFEST_LOADING);

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
      expect(handler).toHaveBeenCalledOnce();
    });

    it('resets on `DESTROYING`', () => {
      const engine = createEngine();
      const host = new HlsJsMediaLive(engine);
      setTargetSeekable(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));
      expect(host.targetLiveWindow).toBe(0);

      (engine as any).emit(Hls.Events.DESTROYING);

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
    });
  });
});
