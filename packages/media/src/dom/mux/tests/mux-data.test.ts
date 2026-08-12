import { afterEach, describe, expect, it, vi } from 'vitest';
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
  engine: unknown = null;
  src = '';
}

/** Shaped like an hls.js instance, class statics included. */
class FakeHlsJsEngine {
  static Events = { MANIFEST_LOADED: 'hlsManifestLoaded' };
  static ErrorDetails = { MANIFEST_LOAD_ERROR: 'manifestLoadError' };
  static version = '1.6.15';
  levels: unknown[] = [];
  on() {}
  off() {}
}

/** Shaped like a dash.js `MediaPlayerClass`. */
class FakeDashJsEngine {
  getCurrentTrackFor() {
    return null;
  }
  getRepresentationsByType() {
    return [];
  }
  on() {}
  off() {}
}

// Initialization is deferred by a microtask so all props settle first.
async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

afterEach(() => {
  document.body.innerHTML = '';
});

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

    const engine = new FakeHlsJsEngine();
    media.engine = engine;
    media.src = 'https://stream.mux.com/abc123.m3u8';
    media.dispatchEvent(new Event('loadstart'));

    await settle();

    expect(monitor).toHaveBeenCalledTimes(2);
    expect(monitor).toHaveBeenLastCalledWith(
      video,
      expect.objectContaining({
        hlsjs: engine,
        Hls: FakeHlsJsEngine,
        data: expect.objectContaining({ video_id: 'abc123' }),
      })
    );
  });

  it('monitors a dash.js engine through the dash.js integration', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();
    media.engine = new FakeDashJsEngine();
    media.src = 'https://example.com/manifest.mpd';

    data.setMedia(media);
    data.attach(video);

    await settle();

    const [, options] = monitor.mock.lastCall!;
    expect(options.dashjs).toBe(media.engine);
    expect(options).not.toHaveProperty('hlsjs');
    expect(options).not.toHaveProperty('Hls');
  });

  it('monitors media with no engine from the media element alone', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();
    media.src = 'https://example.com/video.mp4';

    data.setMedia(media);
    data.attach(video);

    await settle();

    const [, options] = monitor.mock.lastCall!;
    expect(options).not.toHaveProperty('hlsjs');
    expect(options).not.toHaveProperty('Hls');
    expect(options).not.toHaveProperty('dashjs');
  });

  it('moves its media listener when registered with another host', async () => {
    const { sdk, monitor } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk });
    const video = document.createElement('video');
    const first = new FakeMedia();
    const second = new FakeMedia();

    data.setMedia(first);
    data.attach(video);
    await settle();

    data.setMedia(second);
    first.dispatchEvent(new Event('loadstart'));
    await settle();
    expect(monitor).toHaveBeenCalledTimes(1);

    second.dispatchEvent(new Event('loadstart'));
    await settle();
    expect(monitor).toHaveBeenCalledTimes(2);
  });

  it('destroys active monitoring on destroy', () => {
    const data = new MuxData();
    const video = document.createElement('video');
    const destroy = vi.fn();
    Object.defineProperty(video, 'mux', { value: { destroy }, writable: true, configurable: true });

    data.attach(video);
    data.destroy();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(video.mux).toBeUndefined();
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
