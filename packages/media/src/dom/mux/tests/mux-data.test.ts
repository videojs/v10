import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { MuxData } from '..';
import type { MuxDataSdk } from '../types';

function createSdk() {
  const emit = vi.fn();
  const updateData = vi.fn();
  const addHLSJS = vi.fn();
  const removeHLSJS = vi.fn();
  const addDashJS = vi.fn();
  const removeDashJS = vi.fn();
  const destroy = vi.fn();
  let uuid = 0;

  // Like the real SDK, `monitor` installs a live handle on the element.
  const monitor = vi.fn((target: HTMLVideoElement, _options?: any) => {
    destroy.mockImplementation(() => {
      delete target.mux;
    });
    target.mux = { deleted: false, emit, updateData, addHLSJS, removeHLSJS, addDashJS, removeDashJS, destroy } as any;
  });

  const sdk = {
    monitor,
    utils: { now: () => 0, generateUUID: () => `uuid-${++uuid}` },
  } as unknown as MuxDataSdk;

  return { sdk, monitor, emit, updateData, addHLSJS, removeHLSJS, addDashJS, removeDashJS, destroy };
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

// Syncing is deferred by a microtask so all props settle first.
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
        data: expect.objectContaining({ env_key: 'key', player_software_name: 'mux-video', video_id: 'abc123' }),
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

  it('keeps the monitor across a same-source loadstart', async () => {
    const { sdk, monitor, emit, destroy } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);
    await settle();

    // e.g. remote playback engaging or a MediaSource re-attach reruns `load()`.
    media.dispatchEvent(new Event('loadstart'));
    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
    expect(emit).not.toHaveBeenCalled();
  });

  it('emits videochange on the live monitor when the source changes', async () => {
    const { sdk, monitor, emit, destroy } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);
    await settle();

    media.src = 'https://stream.mux.com/def456.m3u8';
    media.dispatchEvent(new Event('loadstart'));
    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
    expect(emit).toHaveBeenCalledWith('videochange', expect.objectContaining({ video_id: 'def456' }));
  });

  it('names the pending view instead of changing videos when the first source arrives', async () => {
    const { sdk, monitor, emit, updateData } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();

    data.setMedia(media);
    data.attach(video);
    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);

    media.src = 'https://stream.mux.com/abc123.m3u8';
    media.dispatchEvent(new Event('loadstart'));
    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
    expect(updateData).toHaveBeenCalledWith(expect.objectContaining({ video_id: 'abc123' }));
  });

  it('hooks a new engine into the live monitor instead of re-monitoring', async () => {
    const { sdk, monitor, addHLSJS, removeHLSJS, destroy } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);
    await settle();

    // An engine rebuild with the same source reruns `load()` with a new instance.
    const engine = new FakeHlsJsEngine();

    media.engine = engine;
    media.dispatchEvent(new Event('loadstart'));
    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);
    expect(destroy).not.toHaveBeenCalled();
    expect(addHLSJS).toHaveBeenCalledWith({ hlsjs: engine, Hls: FakeHlsJsEngine });

    const rebuilt = new FakeHlsJsEngine();

    media.engine = rebuilt;
    media.dispatchEvent(new Event('loadstart'));
    await settle();

    expect(removeHLSJS).toHaveBeenCalledTimes(1);
    expect(addHLSJS).toHaveBeenLastCalledWith({ hlsjs: rebuilt, Hls: FakeHlsJsEngine });
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

  it('keeps one view session id across video changes', async () => {
    const { sdk, monitor, emit } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);
    await settle();

    const [, options] = monitor.mock.lastCall!;
    const { view_session_id } = options.data;

    expect(view_session_id).toBeTruthy();

    media.src = 'https://stream.mux.com/def456.m3u8';
    media.dispatchEvent(new Event('loadstart'));
    await settle();

    expect(emit).toHaveBeenCalledWith('videochange', expect.objectContaining({ view_session_id }));
  });

  it('honors a caller-supplied view session id and never mutates caller metadata', async () => {
    const { sdk, monitor } = createSdk();
    const metadata = { view_session_id: 'caller-session', video_title: 'Some Title' };
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key', metadata });
    const video = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);
    await settle();

    const [, options] = monitor.mock.lastCall!;

    expect(options.data).toEqual(expect.objectContaining({ view_session_id: 'caller-session' }));
    expect(metadata).toEqual({ view_session_id: 'caller-session', video_title: 'Some Title' });
  });

  it('does not write a generated view session id into caller metadata', async () => {
    const { sdk } = createSdk();
    const metadata = { video_title: 'Some Title' };
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key', metadata });
    const video = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);
    await settle();

    expect(metadata).toEqual({ video_title: 'Some Title' });
  });

  it('destroys the old target monitor when attached to a new target', async () => {
    const { sdk, monitor, destroy } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const first = document.createElement('video');
    const second = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(first);
    await settle();

    data.attach(second);
    await settle();

    expect(destroy).toHaveBeenCalledTimes(1);
    expect(first.mux).toBeUndefined();
    expect(monitor).toHaveBeenCalledTimes(2);
    expect(monitor).toHaveBeenLastCalledWith(second, expect.anything());
  });

  it('follows the media when registered with another host', async () => {
    const { sdk, monitor, emit } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk });
    const video = document.createElement('video');
    const first = new FakeMedia();
    const second = new FakeMedia();

    first.src = 'https://stream.mux.com/abc123.m3u8';
    second.src = 'https://stream.mux.com/def456.m3u8';

    data.setMedia(first);
    data.attach(video);
    await settle();

    data.setMedia(second);
    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith('videochange', expect.objectContaining({ video_id: 'def456' }));

    emit.mockClear();
    first.dispatchEvent(new Event('loadstart'));
    await settle();

    expect(emit).not.toHaveBeenCalled();
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

  it('stops syncing after destroy', async () => {
    const { sdk, monitor, emit } = createSdk();
    const data = new MuxData({ MuxDataSdk: sdk, envKey: 'key' });
    const video = document.createElement('video');
    const media = new FakeMedia();

    media.src = 'https://stream.mux.com/abc123.m3u8';

    data.setMedia(media);
    data.attach(video);

    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);

    data.destroy();
    media.src = 'https://stream.mux.com/def456.m3u8';
    media.dispatchEvent(new Event('loadstart'));

    await settle();

    expect(monitor).toHaveBeenCalledTimes(1);
    expect(emit).not.toHaveBeenCalled();
  });
});
