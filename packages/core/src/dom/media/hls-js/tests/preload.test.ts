import HlsJs from 'hls.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTMLVideoElementHost } from '../../html-video-element-host';
import { hlsJsPreload } from '../preload';

afterEach(() => {
  document.body.innerHTML = '';
});

function createEngine(): HlsJs {
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
    loadingEnabled: false,
    media: null,
  } as unknown as HlsJs;
}

class HlsHost extends HTMLVideoElementHost {
  #engine: HlsJs | null;
  constructor(engine: HlsJs | null) {
    super();
    this.#engine = engine;
  }
  override get engine() {
    return this.#engine;
  }
}

function setup(engine: HlsJs = createEngine()) {
  const host = new HlsHost(engine);
  const destroy = hlsJsPreload().install(host);
  const video = document.createElement('video');
  document.body.appendChild(video);
  return { engine, host, video, destroy };
}

describe('hlsJsPreload', () => {
  it('defaults preload to metadata', () => {
    const { host } = setup();
    expect(host.preload).toBe('metadata');
  });

  it('stores preload value even when target is null', () => {
    const { host } = setup();
    host.preload = 'none';
    expect(host.preload).toBe('none');
    expect(host.target).toBeNull();
  });

  it('syncs stored preload to native element on MEDIA_ATTACHED', () => {
    const { engine, host, video } = setup();
    host.preload = 'none';
    expect(host.target).toBeNull();

    host.target = video;
    (engine as any).emit(HlsJs.Events.MEDIA_ATTACHED);

    expect(video.preload).toBe('none');
  });

  it('applies preload set before attach when MEDIA_ATTACHED fires', () => {
    const { engine, host, video } = setup();
    host.preload = 'auto';

    host.target = video;
    (engine as any).emit(HlsJs.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).toHaveBeenCalled();
    expect(video.preload).toBe('auto');
  });

  it('uses stored preload (not native default) for loading strategy on MEDIA_ATTACHED', () => {
    const { engine, host, video } = setup();
    host.preload = 'none';

    host.target = video;
    (engine as any).emit(HlsJs.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).not.toHaveBeenCalled();
  });

  it('starts metadata-level load for preload=metadata', () => {
    const { engine, host, video } = setup();
    host.preload = 'metadata';

    host.target = video;
    (engine as any).emit(HlsJs.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).toHaveBeenCalled();
    expect(engine.config.maxBufferLength).toBe(1);
    expect(engine.config.maxBufferSize).toBe(1);
  });

  it('defers full load to play event when preload=metadata', () => {
    const { engine, host, video } = setup();
    host.preload = 'metadata';

    host.target = video;
    (engine as any).emit(HlsJs.Events.MEDIA_ATTACHED);

    (engine.startLoad as ReturnType<typeof vi.fn>).mockClear();

    video.dispatchEvent(new Event('play'));

    expect(engine.startLoad).toHaveBeenCalled();
    expect(engine.config.maxBufferLength).toBe(30);
    expect(engine.config.maxBufferSize).toBe(60_000_000);
  });

  it('applies preload to native element immediately when target exists', () => {
    const { host, video } = setup();
    host.target = video;
    host.preload = 'auto';

    expect(video.preload).toBe('auto');
  });

  it('cleans up on MEDIA_DETACHED', () => {
    const { engine, host, video } = setup();
    host.preload = 'metadata';

    host.target = video;
    (engine as any).emit(HlsJs.Events.MEDIA_ATTACHED);

    (engine.startLoad as ReturnType<typeof vi.fn>).mockClear();

    (engine as any).emit(HlsJs.Events.MEDIA_DETACHED);

    video.dispatchEvent(new Event('play'));
    expect(engine.startLoad).not.toHaveBeenCalled();
  });

  it('removes the preload layer on destroy', () => {
    const { host, video, destroy } = setup();
    host.target = video;
    host.preload = 'auto';
    expect(host.preload).toBe('auto');

    destroy();

    // After destroy, host.preload falls through to native element default
    expect(host.preload).toBe(video.preload);
  });
});
