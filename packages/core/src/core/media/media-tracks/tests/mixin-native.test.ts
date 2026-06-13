import { afterAll, describe, expect, it, vi } from 'vitest';

class FakeNativeTrackList extends EventTarget {
  #tracks: object[] = [];

  [Symbol.iterator]() {
    return this.#tracks.values();
  }

  add(track: object) {
    this.#tracks.push(track);
    const event = new Event('addtrack') as Event & { track: object };
    event.track = track;
    this.dispatchEvent(event);
  }
}

class FakeHTMLMediaElement {
  #videoTracks = new FakeNativeTrackList();
  #audioTracks = new FakeNativeTrackList();

  get videoTracks() {
    return this.#videoTracks;
  }

  get audioTracks() {
    return this.#audioTracks;
  }
}

// The mixin captures the native track getters from `globalThis.HTMLMediaElement`
// at module load, so stub the global before importing it.
vi.stubGlobal('HTMLMediaElement', FakeHTMLMediaElement);
vi.resetModules();

const { MediaTracksMixin } = await import('../mixin');

afterAll(() => {
  vi.unstubAllGlobals();
});

class NativeMedia extends EventTarget {
  target = new FakeHTMLMediaElement();
}

const NativeMediaWithTracks = MediaTracksMixin(NativeMedia);

describe('MediaTracksMixin', () => {
  it('mirrors native tracks into the custom lists', () => {
    const media = new NativeMediaWithTracks();
    const nativeVideoTrack = { kind: 'main' };

    media.target.videoTracks.add(nativeVideoTrack);

    expect(media.videoTracks.length).toBe(1);
    expect([...media.videoTracks]).toEqual([nativeVideoTrack]);
  });

  it('removes mirrored native video tracks when a custom track is added', async () => {
    const media = new NativeMediaWithTracks();

    media.target.videoTracks.add({ kind: 'main' });
    expect(media.videoTracks.length).toBe(1);

    const custom = media.addVideoTrack('main');
    await Promise.resolve();

    expect(media.videoTracks.length).toBe(1);
    expect([...media.videoTracks]).toEqual([custom]);
  });

  it('removes mirrored native audio tracks when a custom track is added', async () => {
    const media = new NativeMediaWithTracks();

    media.target.audioTracks.add({ kind: 'main' });
    expect(media.audioTracks.length).toBe(1);

    const custom = media.addAudioTrack('main');
    await Promise.resolve();

    expect(media.audioTracks.length).toBe(1);
    expect([...media.audioTracks]).toEqual([custom]);
  });

  it('removes native track listeners when the target is detached', () => {
    const media = new NativeMediaWithTracks();
    const videoList = media.videoTracks;
    const audioList = media.audioTracks;

    media.target.videoTracks.add({ kind: 'main' });
    media.target.audioTracks.add({ kind: 'main' });
    expect(videoList.length).toBe(1);
    expect(audioList.length).toBe(1);

    (media as unknown as { detach(): void }).detach();

    media.target.videoTracks.add({ kind: 'alternative' });
    media.target.audioTracks.add({ kind: 'alternative' });

    // Listeners were torn down, so the detached lists no longer mirror.
    expect(videoList.length).toBe(1);
    expect(audioList.length).toBe(1);
  });
});
