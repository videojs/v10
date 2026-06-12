import { describe, expect, it, vi } from 'vitest';
import { HlsMedia } from '../../hls';
import { addComponent } from '../../media-host';
import { MuxData } from '..';
import type { MuxDataSdk } from '../types';

function createSdk() {
  const monitor = vi.fn();
  const sdk = {
    monitor,
    utils: { now: () => 0, generateUUID: () => 'uuid' },
  } as unknown as MuxDataSdk;
  return { sdk, monitor };
}

class FakeMedia extends EventTarget {
  engine: HlsMedia['engine'] = null;
  src = '';
}

// Initialization is deferred by a microtask so all props settle first.
async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

describe('MuxData', () => {
  it('accepts a player software name', () => {
    expect(new MuxData({ playerSoftwareName: 'mux-video' }).playerSoftwareName).toBe('mux-video');
  });

  it('monitors the attached target with the configured data', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key', playerSoftwareName: 'mux-video' });
    const video = document.createElement('video');
    const media = new FakeMedia();
    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);

    await settle();

    expect(monitor).toHaveBeenCalledWith(
      video,
      expect.objectContaining({
        data: expect.objectContaining({ env_key: 'key', player_software_name: 'mux-video' }),
      })
    );
  });

  it('does not monitor before a target is attached', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk });
    const media = new FakeMedia();
    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);

    await settle();

    expect(monitor).not.toHaveBeenCalled();
  });

  it('re-monitors with the new engine when the media fires loadstart', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();

    data.setMedia(media);
    data.attach(video);

    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);

    const engine = {} as NonNullable<HlsMedia['engine']>;
    media.engine = engine;
    media.src = 'https://stream.mux.com/abc123.m3u8';
    media.dispatchEvent(new Event('loadstart'));

    await settle();

    expect(monitor).toHaveBeenCalledTimes(2);
    expect(monitor).toHaveBeenLastCalledWith(
      video,
      expect.objectContaining({
        hlsjs: engine,
        data: expect.objectContaining({ video_id: 'abc123' }),
      })
    );
  });

  it('exposes mux config under host.config.muxData with inferred types', () => {
    const media = new HlsMedia();
    addComponent(media, new MuxData());

    // Type-level: `config.muxData` infers `Partial<MuxDataProps>` via the
    // component's `configKey` augmentation, so these assignments/reads are
    // checked. This line fails to compile if inference regresses.
    media.config.muxData = { envKey: 'key', debug: true };
    const envKey: string | undefined = media.config.muxData?.envKey;

    expect(envKey).toBe('key');
    // Live binding: the write reached the component instance.
    expect(media.config.muxData).toBeInstanceOf(MuxData);
  });

  it('stops re-monitoring after destroy', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();
    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);

    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);

    data.destroy();
    media.dispatchEvent(new Event('loadstart'));

    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);
  });
});
