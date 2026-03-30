import Hls from 'hls.js';
import { describe, expect, it, vi } from 'vitest';

import { type HlsEngineHost, HlsMediaPreloadMixin } from '../preload';

function createEngine(): Hls {
  const listeners = new Map<string, Set<(...args: any[]) => void>>();
  return {
    config: {
      maxBufferLength: 30,
      maxBufferSize: 60_000_000,
    },
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
    startLoad: vi.fn(),
    media: null,
  } as unknown as Hls;
}

class FakeHost implements HlsEngineHost {
  engine: Hls | null;
  target: HTMLMediaElement | null = null;

  constructor(engine: Hls | null = null) {
    this.engine = engine;
  }
}

const PreloadHost = HlsMediaPreloadMixin(FakeHost);

describe('HlsMediaPreloadMixin', () => {
  it('defaults preload to metadata', () => {
    const host = new PreloadHost(null);
    expect(host.preload).toBe('metadata');
  });

  it('stores preload value even when target is null', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    host.preload = 'none';

    expect(host.preload).toBe('none');
    expect(host.target).toBeNull();
  });

  it('syncs stored preload to native element on MEDIA_ATTACHED', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    host.preload = 'none';
    expect(host.target).toBeNull();

    const video = document.createElement('video');
    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    expect(video.preload).toBe('none');
  });

  it('applies preload set before attach when MEDIA_ATTACHED fires', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    host.preload = 'auto';

    const video = document.createElement('video');
    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).toHaveBeenCalled();
    expect(video.preload).toBe('auto');
  });

  it('uses stored preload (not native default) for loading strategy on MEDIA_ATTACHED', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    host.preload = 'none';

    const video = document.createElement('video');
    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).not.toHaveBeenCalled();
  });

  it('starts metadata-level load for preload=metadata', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    host.preload = 'metadata';

    const video = document.createElement('video');
    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).toHaveBeenCalled();
    expect(engine.config.maxBufferLength).toBe(1);
    expect(engine.config.maxBufferSize).toBe(1);
  });

  it('defers full load to play event when preload=metadata', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    host.preload = 'metadata';

    const video = document.createElement('video');
    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    (engine.startLoad as ReturnType<typeof vi.fn>).mockClear();

    video.dispatchEvent(new Event('play'));

    expect(engine.startLoad).toHaveBeenCalled();
    expect(engine.config.maxBufferLength).toBe(30);
    expect(engine.config.maxBufferSize).toBe(60_000_000);
  });

  it('applies preload to native element immediately when target exists', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    const video = document.createElement('video');
    host.target = video;

    host.preload = 'auto';

    expect(video.preload).toBe('auto');
  });

  it('cleans up on MEDIA_DETACHED', () => {
    const engine = createEngine();
    const host = new PreloadHost(engine);

    host.preload = 'metadata';

    const video = document.createElement('video');
    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    (engine.startLoad as ReturnType<typeof vi.fn>).mockClear();

    (engine as any).emit(Hls.Events.MEDIA_DETACHED);

    video.dispatchEvent(new Event('play'));
    expect(engine.startLoad).not.toHaveBeenCalled();
  });
});
