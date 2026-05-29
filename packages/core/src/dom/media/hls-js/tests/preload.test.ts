import Hls from 'hls.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { HTMLVideoElementHost } from '../../html-video-element-host';
import { hlsJsPreload } from '../preload';

afterEach(() => {
  document.body.innerHTML = '';
});

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
    loadingEnabled: false,
    media: null,
  } as unknown as Hls;
}

class HlsHost extends HTMLVideoElementHost<Hls> {
  #engine: Hls | null;
  constructor(engine: Hls | null) {
    super();
    this.#engine = engine;
  }
  override get engine() {
    return this.#engine;
  }
}

function setup(engine: Hls = createEngine()) {
  const host = new HlsHost(engine);
  const extension = hlsJsPreload();
  extension.install(host);
  const video = document.createElement('video');
  document.body.appendChild(video);
  return { engine, host, video, extension };
}

describe('hlsJsPreload', () => {
  it('applies preload set before attach when MEDIA_ATTACHED fires', () => {
    const { engine, host, video } = setup();
    host.preload = 'auto';

    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).toHaveBeenCalled();
    expect(video.preload).toBe('auto');
  });

  it('starts metadata-level load for preload=metadata', () => {
    const { engine, host, video } = setup();
    host.preload = 'metadata';

    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    expect(engine.startLoad).toHaveBeenCalled();
    expect(engine.config.maxBufferLength).toBe(1);
    expect(engine.config.maxBufferSize).toBe(1);
  });

  it('defers full load to play event when preload=metadata', () => {
    const { engine, host, video } = setup();
    host.preload = 'metadata';

    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    (engine.startLoad as ReturnType<typeof vi.fn>).mockClear();

    video.dispatchEvent(new Event('play'));

    expect(engine.startLoad).toHaveBeenCalled();
    expect(engine.config.maxBufferLength).toBe(30);
    expect(engine.config.maxBufferSize).toBe(60_000_000);
  });

  it('cleans up on MEDIA_DETACHED', () => {
    const { engine, host, video } = setup();
    host.preload = 'metadata';

    host.target = video;
    (engine as any).emit(Hls.Events.MEDIA_ATTACHED);

    (engine.startLoad as ReturnType<typeof vi.fn>).mockClear();

    (engine as any).emit(Hls.Events.MEDIA_DETACHED);

    video.dispatchEvent(new Event('play'));
    expect(engine.startLoad).not.toHaveBeenCalled();
  });
});
