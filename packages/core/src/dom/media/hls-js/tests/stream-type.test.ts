import Hls from 'hls.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MediaStreamTypes } from '../../../../core/media/types';
import { HTMLVideoElementHost } from '../../html-video-element-host';
import { hlsJsStreamType } from '../stream-type';

afterEach(() => {
  document.body.innerHTML = '';
});

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

class HlsHost extends HTMLVideoElementHost<Hls> {
  #engine: Hls;
  constructor(engine: Hls) {
    super();
    this.#engine = engine;
  }
  override get engine() {
    return this.#engine;
  }
}

function setup() {
  const engine = createEngine();
  const host = new HlsHost(engine);
  const extension = hlsJsStreamType();
  extension.install(host);
  return { engine, host, extension };
}

describe('hlsJsStreamType', () => {
  it('starts as unknown', () => {
    const { host } = setup();
    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('detects live from a LEVEL_LOADED event with live details', () => {
    const { engine, host } = setup();
    const handler = vi.fn();
    host.addEventListener('streamtypechange', handler);

    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: true } });

    expect(host.streamType).toBe(MediaStreamTypes.LIVE);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('detects on-demand from a LEVEL_LOADED event without live details', () => {
    const { engine, host } = setup();
    const handler = vi.fn();
    host.addEventListener('streamtypechange', handler);

    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: false } });

    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('dedupes streamtypechange when the detected value does not change', () => {
    const { engine, host } = setup();
    const handler = vi.fn();
    host.addEventListener('streamtypechange', handler);

    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: true } });
    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: true } });

    expect(handler).toHaveBeenCalledOnce();
  });

  it('resets to unknown on MANIFEST_LOADING', () => {
    const { engine, host } = setup();
    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: true } });
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);

    (engine as any).emit(Hls.Events.MANIFEST_LOADING);
    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('resets to unknown on DESTROYING', () => {
    const { engine, host } = setup();
    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: false } });
    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);

    (engine as any).emit(Hls.Events.DESTROYING);
    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });

  it('lets user-set values win over auto-detection', () => {
    const { engine, host } = setup();
    const handler = vi.fn();
    host.addEventListener('streamtypechange', handler);

    host.streamType = MediaStreamTypes.LIVE;
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);
    expect(handler).toHaveBeenCalledOnce();

    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: false } });
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('clears the user override when set back to unknown', () => {
    const { engine, host } = setup();
    host.streamType = MediaStreamTypes.LIVE;

    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: false } });
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);

    host.streamType = MediaStreamTypes.UNKNOWN;
    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);

    (engine as any).emit(Hls.Events.LEVEL_LOADED, { details: { live: false } });
    expect(host.streamType).toBe(MediaStreamTypes.ON_DEMAND);
  });

  it('removes the layer on destroy', () => {
    const { host, extension } = setup();
    host.streamType = MediaStreamTypes.LIVE;
    expect(host.streamType).toBe(MediaStreamTypes.LIVE);

    extension.destroy();

    expect(host.streamType).toBe(MediaStreamTypes.UNKNOWN);
  });
});
