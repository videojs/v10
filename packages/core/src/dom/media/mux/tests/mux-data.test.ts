import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HlsMedia } from '../../hls';
import { HTMLVideoElementHost } from '../../html-video-element-host';
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

class FakeMuxDataMedia extends HTMLVideoElementHost {
  #engine: HlsMedia['engine'];
  #src: string;

  constructor(overrides: Partial<HlsMedia> = {}) {
    super();
    this.#engine = overrides.engine ?? null;
    this.#src = overrides.src ?? '';
    if (overrides.target) this.target = overrides.target as HTMLVideoElement;
  }

  override get engine() {
    return this.#engine;
  }

  override get src() {
    return this.#src;
  }

  override load() {
    return this.next?.load?.();
  }
}

function makeHost(overrides: Partial<HlsMedia> = {}) {
  return new FakeMuxDataMedia(overrides);
}

function makeTarget(): HTMLVideoElement {
  const video = document.createElement('video');
  Object.defineProperty(video, 'load', { configurable: true, value: vi.fn() });
  return video;
}

describe('muxData', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('initializes the SDK against host.target on `load()`', async () => {
    const MuxDataSdk = makeSdk();
    const target = makeTarget();
    const host = makeHost({ target, src: 'https://example.com/v.m3u8' });
    const ext = muxData({ MuxDataSdk, envKey: 'env-1' });

    ext.install(host);
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

    muxData({ MuxDataSdk }).install(host);
    await host.load();

    expect(MuxDataSdk.monitor).not.toHaveBeenCalled();
  });

  it('passes the host engine through as `hlsjs`', async () => {
    const MuxDataSdk = makeSdk();
    const target = makeTarget();
    const engine = { fake: 'engine' };
    const host = makeHost({ target, engine: engine as unknown as HlsMedia['engine'] });

    muxData({ MuxDataSdk }).install(host);
    await host.load();

    expect(MuxDataSdk.monitor).toHaveBeenCalledWith(target, expect.objectContaining({ hlsjs: engine }));
  });

  it('destroys mux on the current target when uninstalled', () => {
    const MuxDataSdk = makeSdk();
    const target = makeTarget();
    const host = makeHost({ target });
    const destroy = vi.fn();

    const extension = muxData({ MuxDataSdk });
    extension.install(host);
    // Simulate the SDK installing its handle on the element after monitor().
    Object.assign(target, { mux: { destroy, deleted: false } });

    extension.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(target.mux).toBeUndefined();
  });
});
