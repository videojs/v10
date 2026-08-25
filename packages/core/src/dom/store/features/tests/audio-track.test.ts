import type { AudioTrackLike } from '@videojs/media';
import { createStore } from '@videojs/store';
import { describe, expect, it } from 'vite-plus/test';

import type { PlayerTarget } from '../../../player';
import { audioTrackFeature } from '../audio-track';

class TestAudioTrackList extends EventTarget {
  tracks: AudioTrackLike[];

  constructor(tracks: AudioTrackLike[]) {
    super();
    this.tracks = tracks;
  }

  [Symbol.iterator](): Iterator<AudioTrackLike> {
    return this.tracks.values();
  }

  get length(): number {
    return this.tracks.length;
  }
}

class TestMedia extends EventTarget {
  audioTracks: TestAudioTrackList | undefined = undefined;

  constructor(tracks?: AudioTrackLike[]) {
    super();
    if (tracks) this.audioTracks = new TestAudioTrackList(tracks);
  }

  async play() {}
}

function createTrack(overrides: Partial<AudioTrackLike>): AudioTrackLike {
  return {
    id: undefined,
    kind: undefined,
    label: '',
    language: '',
    enabled: false,
    addRendition: () => ({ id: undefined, bitrate: undefined, codec: undefined, selected: false }),
    removeRendition: () => {},
    ...overrides,
  };
}

function createMedia(tracks: AudioTrackLike[]): PlayerTarget['media'] {
  return /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ new TestMedia(
    tracks
  ) as PlayerTarget['media'];
}

describe('audioTrackFeature', () => {
  it('syncs audio tracks on attach', () => {
    const media = createMedia([
      createTrack({ id: '0', kind: 'main', label: 'English', language: 'en', enabled: true }),
      createTrack({ id: '1', kind: 'alternative', label: 'Spanish', language: 'es' }),
    ]);
    const store = createStore<PlayerTarget>()(audioTrackFeature);

    store.attach({ media, container: null });

    expect(store.state.audioTrackList).toEqual([
      { id: '0', kind: 'main', label: 'English', language: 'en', enabled: true },
      { id: '1', kind: 'alternative', label: 'Spanish', language: 'es', enabled: false },
    ]);
  });

  it('syncs audio tracks after loadstart', () => {
    const media =
      /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ new TestMedia() as PlayerTarget['media'];
    const store = createStore<PlayerTarget>()(audioTrackFeature);

    store.attach({ media, container: null });

    expect(store.state.audioTrackList).toEqual([]);

    const list = new TestAudioTrackList([createTrack({ id: '0', label: 'English', enabled: true })]);
    /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ (
      media as TestMedia
    ).audioTracks = list;
    media.dispatchEvent(new Event('loadstart'));

    expect(store.state.audioTrackList).toEqual([{ id: '0', label: 'English', language: '', enabled: true }]);

    list.tracks.push(createTrack({ id: '1', label: 'Spanish' }));
    list.dispatchEvent(new Event('addtrack'));

    expect(store.state.audioTrackList).toEqual([
      { id: '0', label: 'English', language: '', enabled: true },
      { id: '1', label: 'Spanish', language: '', enabled: false },
    ]);
  });

  it('resyncs on audio track change', () => {
    const media = createMedia([createTrack({ id: '0', label: 'English' }), createTrack({ id: '1', label: 'Spanish' })]);
    const store = createStore<PlayerTarget>()(audioTrackFeature);
    store.attach({ media, container: null });

    /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ (
      media as any
    ).audioTracks.tracks[1].enabled = true;
    /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ (
      media as any
    ).audioTracks.dispatchEvent(new Event('change'));

    expect(store.state.audioTrackList[1]?.enabled).toBe(true);
  });

  it('selects an audio track exclusively', () => {
    const media = createMedia([
      createTrack({ id: '0', label: 'English', enabled: true }),
      createTrack({ id: '1', label: 'Spanish' }),
    ]);
    const store = createStore<PlayerTarget>()(audioTrackFeature);
    store.attach({ media, container: null });

    store.state.selectAudioTrack('1');

    expect(
      [
        .../* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ ((
          media as any
        ).audioTracks as TestAudioTrackList),
      ].map((track) => track.enabled)
    ).toEqual([false, true]);
  });

  it('ignores unknown audio track values', () => {
    const media = createMedia([createTrack({ id: '0', label: 'English', enabled: true })]);
    const store = createStore<PlayerTarget>()(audioTrackFeature);
    store.attach({ media, container: null });

    store.state.selectAudioTrack('missing');

    expect(
      [
        .../* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ /* SAFETY: This fixture deliberately supplies the asserted contract for the scenario under test. */ ((
          media as any
        ).audioTracks as TestAudioTrackList),
      ].map((track) => track.enabled)
    ).toEqual([true]);
  });
});
