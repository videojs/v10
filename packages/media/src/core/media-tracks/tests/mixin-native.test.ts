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
  #videoTracks: unknown;
  #audioTracks: unknown;

  // Native lists are event targets where they are implemented, and stubbed out
  // as plain arrays where they are not (jsdom), so both are constructible here.
  constructor(videoTracks: unknown = new FakeNativeTrackList(), audioTracks: unknown = new FakeNativeTrackList()) {
    this.#videoTracks = videoTracks;
    this.#audioTracks = audioTracks;
  }

  get videoTracks() {
    return this.#videoTracks as FakeNativeTrackList;
  }

  get audioTracks() {
    return this.#audioTracks as FakeNativeTrackList;
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

class StubbedNativeMedia extends EventTarget {
  target = new FakeHTMLMediaElement([{ kind: 'main' }], [{ kind: 'main' }]);
}

const StubbedNativeMediaWithTracks = MediaTracksMixin(StubbedNativeMedia);

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

  it('keeps the lists local when native tracks publish no changes', () => {
    const media = new StubbedNativeMediaWithTracks();

    // Nothing to mirror and nothing to subscribe to, so only authored tracks show.
    expect(media.videoTracks.length).toBe(0);
    expect(media.audioTracks.length).toBe(0);

    const videoTrack = media.addVideoTrack('main');
    const audioTrack = media.addAudioTrack('main');

    expect([...media.videoTracks]).toEqual([videoTrack]);
    expect([...media.audioTracks]).toEqual([audioTrack]);
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
