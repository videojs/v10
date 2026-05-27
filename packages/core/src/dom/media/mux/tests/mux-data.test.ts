import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HlsMedia } from '../../hls';
import { type MuxDataSdk, muxData } from '../mux-data';

// Minimal stub of the mux-embed SDK surface that the extension touches.
function makeSdk(): MuxDataSdk {
  return {
    monitor: vi.fn(),
    utils: {
      now: () => 1000,
      generateUUID: () => 'test-uuid',
    },
  } as unknown as MuxDataSdk;
}

// Minimal `HlsMedia`-shaped host with a layer chain: `next` is writable so
// `addLayer` can push the mux-data layer onto it, and `load()` walks the chain
// (so the test can drive SDK initialization via `host.load()`).
function makeHost(overrides: Partial<HlsMedia> = {}) {
  const host = new EventTarget() as unknown as HlsMedia & EventTarget;
  Object.assign(host, {
    next: null,
    load(this: { next: { load?: () => Promise<void> | void } | null }) {
      return this.next?.load?.();
    },
    target: null,
    engine: null,
    debug: false,
    src: '',
    ...overrides,
  });
  return host;
}

function makeTarget(): HTMLVideoElement {
  return document.createElement('video');
}

describe('muxData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an extension named `mux-data`', () => {
    expect(muxData().name).toBe('mux-data');
  });

  it('captures playerInitTime from the SDK at factory-call time', () => {
    const MuxDataSdk = makeSdk();
    const ext = muxData({ MuxDataSdk });

    expect(ext.playerInitTime).toBe(1000);
  });

  it('honours an explicit playerInitTime', () => {
    expect(muxData({ playerInitTime: 42 }).playerInitTime).toBe(42);
  });

  it('initializes the SDK against host.target on `load()`', async () => {
    const MuxDataSdk = makeSdk();
    const target = makeTarget();
    const host = makeHost({ target, src: 'https://example.com/v.m3u8' });
    const ext = muxData({ MuxDataSdk, envKey: 'env-1' });

    ext.install?.(host);
    await host.load();

    expect(MuxDataSdk.monitor).toHaveBeenCalledTimes(1);
    expect(MuxDataSdk.monitor).toHaveBeenCalledWith(
      target,
      expect.objectContaining({
        data: expect.objectContaining({ env_key: 'env-1' }),
      })
    );
  });

  it('does not re-initialize when mux is already live on the target', async () => {
    const MuxDataSdk = makeSdk();
    const target = makeTarget();
    // Pretend mux is already installed (and not deleted).
    Object.assign(target, { mux: { destroy: vi.fn(), deleted: false } });
    const host = makeHost({ target });

    muxData({ MuxDataSdk }).install?.(host);
    await host.load();

    expect(MuxDataSdk.monitor).not.toHaveBeenCalled();
  });

  it('passes the host engine through as `hlsjs`', async () => {
    const MuxDataSdk = makeSdk();
    const target = makeTarget();
    const engine = { fake: 'engine' };
    const host = makeHost({ target, engine: engine as unknown as HlsMedia['engine'] });

    muxData({ MuxDataSdk }).install?.(host);
    await host.load();

    expect(MuxDataSdk.monitor).toHaveBeenCalledWith(target, expect.objectContaining({ hlsjs: engine }));
  });

  it('destroys mux on the current target when uninstalled', () => {
    const MuxDataSdk = makeSdk();
    const target = makeTarget();
    const host = makeHost({ target });
    const destroy = vi.fn();

    const dispose = muxData({ MuxDataSdk }).install?.(host);
    // Simulate the SDK installing its handle on the element after monitor().
    Object.assign(target, { mux: { destroy, deleted: false } });

    dispose?.();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(target.mux).toBeUndefined();
  });

  it('stops intercepting `load()` after uninstall', async () => {
    const MuxDataSdk = makeSdk();
    const host = makeHost({ target: makeTarget() });

    const dispose = muxData({ MuxDataSdk }).install?.(host);
    dispose?.();
    await host.load();

    expect(MuxDataSdk.monitor).not.toHaveBeenCalled();
  });

  it('exposes a mutable config surface (mirrors the legacy mixin)', () => {
    const ext = muxData({ envKey: 'a' });

    ext.envKey = 'b';
    ext.metadata = { video_title: 'Hello' };

    expect(ext.envKey).toBe('b');
    expect(ext.metadata?.video_title).toBe('Hello');
  });
});
