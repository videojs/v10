import Hls from 'hls.js';
import { describe, expect, it, vi } from 'vitest';
import { HTMLVideoElementHost } from '../../html-video-element-host';
import { hlsJsLive } from '../live';

function createEngine(userConfig: Record<string, unknown> = {}): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  return {
    config: { ...userConfig },
    userConfig: { ...userConfig },
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

class FakeHlsJsMedia extends HTMLVideoElementHost<Hls> {
  #engine: Hls;
  constructor(engine: Hls) {
    super();
    this.#engine = engine;
  }
  override get engine(): Hls | null {
    return this.#engine;
  }
}

// Minimal LevelDetails shape — only the fields the extension reads.
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

function setTarget(host: FakeHlsJsMedia, ranges: [number, number][]) {
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

describe('hlsJsLive', () => {
  describe('targetLiveWindow derivation', () => {
    it('is `0` for standard live', () => {
      const engine = createEngine();
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);

      const handler = vi.fn();
      host.addEventListener('targetlivewindowchange', handler);

      emitLevelLoaded(engine, levelDetails({ live: true, type: null, holdBack: 18 }));

      expect(host.targetLiveWindow).toBe(0);
      expect(handler).toHaveBeenCalledOnce();
    });

    it('is `Infinity` for an `EVENT` playlist (DVR)', () => {
      const engine = createEngine();
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);

      emitLevelLoaded(engine, levelDetails({ live: true, type: 'EVENT', holdBack: 18 }));

      expect(host.targetLiveWindow).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe('liveEdgeStart derivation', () => {
    it('uses `holdBack` for standard live (`seekable.end - holdBack`)', () => {
      const engine = createEngine();
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);
      setTarget(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18, targetduration: 6 }));

      expect(host.liveEdgeStart).toBe(42);
    });

    it('falls back to `partTarget * 2` when `partHoldBack` is absent', () => {
      const engine = createEngine();
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);
      setTarget(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, partList: [{}], partHoldBack: 0, partTarget: 0.5 }));

      expect(host.liveEdgeStart).toBe(59);
    });
  });

  describe('seek-to-live on first play', () => {
    function emitManifestLoading(engine: Hls) {
      (engine as any).emit(Hls.Events.MANIFEST_LOADING);
    }

    it('seeks to `liveEdgeStart` on the first `play` event', () => {
      const engine = createEngine();
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);
      const video = setTarget(host, [[0, 60]]);

      emitManifestLoading(engine);
      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18, targetduration: 6 }));

      video.dispatchEvent(new Event('play'));

      expect(video.currentTime).toBe(42);
    });

    it('defers the seek until `liveEdgeStart` becomes finite (preload="none")', () => {
      const engine = createEngine();
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);
      const video = setTarget(host, [[0, 60]]);

      // Manifest is requested at startup but `LEVEL_LOADED` only arrives after `play`.
      emitManifestLoading(engine);
      video.dispatchEvent(new Event('play'));
      expect(video.currentTime).toBe(0);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));

      expect(video.currentTime).toBe(42);
    });
  });

  describe('hls.js config updates', () => {
    it('applies low-latency defaults when partList is present', () => {
      const engine = createEngine({ abrBandWidthFactor: 0.95 });
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);
      setTarget(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, partList: [{}], partHoldBack: 2, partTarget: 0.5 }));

      expect((engine as any).config.backBufferLength).toBe(4);
      expect((engine as any).config.maxFragLookUpTolerance).toBe(0.001);
      expect((engine as any).config.abrBandWidthUpFactor).toBe(0.95);
    });

    it('respects user-supplied overrides', () => {
      const engine = createEngine({ backBufferLength: 30 });
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);
      setTarget(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));

      expect((engine as any).config.backBufferLength).toBe(30);
    });
  });

  describe('reset', () => {
    it('resets on `MANIFEST_LOADING`', () => {
      const engine = createEngine();
      const host = new FakeHlsJsMedia(engine);
      hlsJsLive().install(host);
      setTarget(host, [[0, 60]]);

      emitLevelLoaded(engine, levelDetails({ live: true, holdBack: 18 }));
      expect(host.targetLiveWindow).toBe(0);

      const handler = vi.fn();
      host.addEventListener('targetlivewindowchange', handler);

      (engine as any).emit(Hls.Events.MANIFEST_LOADING);

      expect(host.targetLiveWindow).toBeNaN();
      expect(host.liveEdgeStart).toBeNaN();
      expect(handler).toHaveBeenCalledOnce();
    });
  });
});
