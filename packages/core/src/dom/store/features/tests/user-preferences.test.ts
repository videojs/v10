import { combine, createStore, flush } from '@videojs/store';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { VideoRenditionLike } from '../../../../core/media/types';
import type { PlayerTarget } from '../../../media/types';
import { createMockVideo } from '../../../tests/test-helpers';
import { playbackRateFeature } from '../playback-rate';
import { qualityFeature } from '../quality';
import { textTrackFeature } from '../text-track';
import { timeFeature } from '../time';
import {
  getUserPreference,
  setUserPreference,
  type UserPreferencesStorage,
  userPreferencesFeature,
} from '../user-preferences';
import { volumeFeature } from '../volume';

const STORAGE_KEY = 'media:user-preferences';
const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');

class TestStorage implements UserPreferencesStorage {
  values = new Map<string, string>();
  setItem = vi.fn((key: string, value: string) => {
    this.values.set(key, value);
  });

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
}

class BrokenStorage implements UserPreferencesStorage {
  getItem(): string | null {
    throw new Error('No storage');
  }

  setItem(): void {
    throw new Error('No storage');
  }
}

class TestTextTrackList extends EventTarget {
  readonly length: number;
  [index: number]: TextTrack;

  constructor(tracks: TextTrack[]) {
    super();
    this.length = tracks.length;
    for (const [index, track] of tracks.entries()) this[index] = track;
  }

  [Symbol.iterator](): Iterator<TextTrack> {
    return Array.from({ length: this.length }, (_, index) => this[index]!).values();
  }
}

class TestRenditionList extends EventTarget {
  renditions: VideoRenditionLike[];

  constructor(renditions: VideoRenditionLike[]) {
    super();
    this.renditions = renditions;
  }

  [Symbol.iterator](): Iterator<VideoRenditionLike> {
    return this.renditions.values();
  }

  get length(): number {
    return this.renditions.length;
  }

  get selectedIndex(): number {
    return this.renditions.findIndex((rendition) => rendition.selected);
  }

  set selectedIndex(index: number) {
    for (const [renditionIndex, rendition] of this.renditions.entries()) {
      rendition.selected = renditionIndex === index;
    }
  }
}

function createTrack(
  kind: TextTrackKind,
  mode: TextTrackMode = 'disabled',
  options: { id?: string; label?: string; language?: string } = {}
): TextTrack {
  return {
    id: options.id ?? '',
    kind,
    mode,
    label: options.label ?? '',
    language: options.language ?? '',
  } as TextTrack;
}

function createRendition(overrides: Partial<VideoRenditionLike>): VideoRenditionLike {
  return {
    id: undefined,
    width: undefined,
    height: undefined,
    bitrate: undefined,
    frameRate: undefined,
    codec: undefined,
    selected: false,
    ...overrides,
  };
}

function setTextTracks(video: HTMLVideoElement, tracks: TextTrack[]): TestTextTrackList {
  const list = new TestTextTrackList(tracks);
  Object.defineProperty(video, 'textTracks', {
    configurable: true,
    value: list,
  });
  return list;
}

function setRenditions(video: HTMLVideoElement, renditions: VideoRenditionLike[]): TestRenditionList {
  const list = new TestRenditionList(renditions);
  Object.defineProperty(video, 'videoRenditions', {
    configurable: true,
    value: list,
  });
  return list;
}

function createMedia(): HTMLVideoElement {
  const video = createMockVideo({ volume: 1, muted: false });
  video.playbackRate = 1;
  setTextTracks(video, []);
  setRenditions(video, []);
  return video;
}

function spyMediaValue(media: HTMLVideoElement, key: 'playbackRate' | 'volume', initial: number) {
  let value = initial;
  const set = vi.fn((next: number) => {
    value = next;
  });

  Object.defineProperty(media, key, {
    configurable: true,
    get: () => value,
    set,
  });

  return set;
}

function createPlayerStore(storage: UserPreferencesStorage) {
  return createStore<PlayerTarget>()(
    combine(playbackRateFeature, volumeFeature, textTrackFeature, qualityFeature, userPreferencesFeature({ storage }))
  );
}

async function ready(): Promise<void> {
  await Promise.resolve();
  flush();
}

function setLocalStorage(storage: UserPreferencesStorage): void {
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: storage,
  });
}

afterEach(() => {
  if (localStorageDescriptor) {
    Object.defineProperty(globalThis, 'localStorage', localStorageDescriptor);
  } else {
    Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

describe('userPreferencesFeature', () => {
  it('stores generic preferences', () => {
    const storage = new TestStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify({ playbackRate: 1.5 }));

    const store = createStore<PlayerTarget>()(userPreferencesFeature({ storage }));

    expect(store.state.getUserPreference('playbackRate')).toBe(1.5);
    expect(getUserPreference(store.state, 'playbackRate')).toBe(1.5);

    store.state.setUserPreference('theme', 'dark');
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!)).toEqual({
      playbackRate: 1.5,
      theme: 'dark',
    });
  });

  it('no-ops when the feature is absent', () => {
    const state = {};

    expect(getUserPreference(state, 'theme')).toBeUndefined();
    expect(() => setUserPreference(state, 'theme', 'dark')).not.toThrow();
  });

  it('ignores corrupt and unavailable storage', () => {
    const storage = new TestStorage();
    storage.values.set(STORAGE_KEY, '{nope');

    const store = createStore<PlayerTarget>()(userPreferencesFeature({ storage }));
    const brokenStore = createStore<PlayerTarget>()(userPreferencesFeature({ storage: new BrokenStorage() }));

    expect(store.state.userPreferences).toEqual({});
    expect(brokenStore.state.userPreferences).toEqual({});
    expect(() => brokenStore.state.setUserPreference('theme', 'dark')).not.toThrow();
  });

  it('restores persisted media preferences', async () => {
    const storage = new TestStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify({
        playbackRate: 1.5,
        volume: { volume: 0.25, muted: true },
        captions: { value: 'es' },
        quality: 720,
      })
    );

    const video = createMedia();
    const spanish = createTrack('subtitles', 'disabled', { id: 'subtitles0', label: 'Spanish', language: 'es' });
    setTextTracks(video, [createTrack('subtitles', 'disabled', { id: 'en' }), spanish]);
    const renditions = setRenditions(video, [
      createRendition({ id: '1080p', width: 1920, height: 1080 }),
      createRendition({ id: '720p', width: 1280, height: 720 }),
    ]);

    const store = createPlayerStore(storage);
    store.attach({ media: video, container: null });
    await ready();

    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBe(0.25);
    expect(video.muted).toBe(true);
    expect(spanish.mode).toBe('showing');
    expect(renditions.selectedIndex).toBe(-1);
  });

  it('persists changed media preferences', async () => {
    const storage = new TestStorage();
    const video = createMedia();
    const spanish = createTrack('subtitles', 'disabled', { id: 'subtitles0', label: 'Spanish', language: 'es' });
    const renditions = setRenditions(video, [
      createRendition({ id: '1080p', width: 1920, height: 1080 }),
      createRendition({ id: '720p', width: 1280, height: 720 }),
    ]);
    setTextTracks(video, [spanish]);
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    expect(storage.setItem).not.toHaveBeenCalled();

    video.playbackRate = 1.5;
    video.dispatchEvent(new Event('ratechange'));
    store.state.setVolume(0.333);
    store.state.selectSubtitlesTrack('subtitles0');
    store.state.selectVideoRendition('720p');

    expect(renditions.selectedIndex).toBe(1);
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!)).toEqual({
      playbackRate: 1.5,
      volume: { volume: 0.33, muted: false },
      captions: { value: 'es', id: 'subtitles0' },
    });
  });

  it('does not write defaults after attach or detach', async () => {
    const storage = new TestStorage();
    const video = createMedia();
    const store = createPlayerStore(storage);
    const detach = store.attach({ media: video, container: null });

    await ready();
    detach();
    flush();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('refreshes stored preferences when media reattaches', async () => {
    const storage = new TestStorage();
    const store = createPlayerStore(storage);
    const video = createMedia();

    const detach = store.attach({ media: video, container: null });
    await ready();

    video.playbackRate = 1.5;
    video.dispatchEvent(new Event('ratechange'));
    store.state.setVolume(0.25);
    await ready();

    expect(JSON.parse(storage.values.get(STORAGE_KEY)!)).toMatchObject({
      playbackRate: 1.5,
      volume: { volume: 0.25, muted: false },
    });

    detach();
    flush();

    expect(store.state.userPreferences).toEqual({});

    const nextVideo = createMedia();
    store.attach({ media: nextVideo, container: null });
    await ready();

    expect(nextVideo.playbackRate).toBe(1.5);
    expect(nextVideo.volume).toBe(0.25);
  });

  it('does not reapply volume and playback rate for unrelated store changes', async () => {
    const storage = new TestStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify({
        playbackRate: 1.5,
        volume: { volume: 0.25, muted: false },
      })
    );

    const video = createMedia();
    const setPlaybackRate = spyMediaValue(video, 'playbackRate', 1);
    const setVolume = spyMediaValue(video, 'volume', 1);
    const store = createStore<PlayerTarget>()(
      combine(playbackRateFeature, volumeFeature, timeFeature, userPreferencesFeature({ storage }))
    );

    store.attach({ media: video, container: null });
    await ready();

    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBe(0.25);

    setPlaybackRate.mockClear();
    setVolume.mockClear();

    video.currentTime = 10;
    video.dispatchEvent(new Event('timeupdate'));
    await ready();

    expect(store.state.currentTime).toBe(10);
    expect(setPlaybackRate).not.toHaveBeenCalled();
    expect(setVolume).not.toHaveBeenCalled();
  });

  it('resets volume and playback rate when preferences are removed', async () => {
    const storage = new TestStorage();
    storage.values.set(
      STORAGE_KEY,
      JSON.stringify({
        playbackRate: 1.5,
        volume: { volume: 0.25, muted: true },
      })
    );

    const video = createMedia();
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBe(0.25);
    expect(video.muted).toBe(true);

    store.state.setUserPreference('playbackRate', undefined);
    store.state.setUserPreference('volume', undefined);
    await ready();

    expect(video.playbackRate).toBe(1);
    expect(video.volume).toBe(1);
    expect(video.muted).toBe(false);
  });

  it('does not persist captions off during track discovery', async () => {
    const storage = new TestStorage();
    const video = createMedia();
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    setTextTracks(video, [createTrack('subtitles', 'disabled', { id: 'en', label: 'English', language: 'en' })]);
    video.dispatchEvent(new Event('loadstart'));
    flush();

    expect(storage.setItem).not.toHaveBeenCalled();
  });

  it('persists toggled captions using native track order', async () => {
    const storage = new TestStorage();
    const video = createMedia();
    const english = createTrack('subtitles', 'disabled', { id: 'subtitles0', label: 'English', language: 'en' });
    const spanish = createTrack('captions', 'disabled', { id: 'captions0', label: 'Spanish', language: 'es' });
    setTextTracks(video, [english, spanish]);
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    store.state.toggleSubtitles(true);

    expect(JSON.parse(storage.values.get(STORAGE_KEY)!)).toEqual({
      captions: { value: 'en', id: 'subtitles0' },
    });
  });

  it('restores same-language captions by track id', async () => {
    const storage = new TestStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify({ captions: { value: 'en', id: 'descriptive' } }));

    const video = createMedia();
    const english = createTrack('subtitles', 'disabled', { id: 'english', label: 'English', language: 'en' });
    const descriptive = createTrack('subtitles', 'disabled', {
      id: 'descriptive',
      label: 'English descriptive',
      language: 'en',
    });
    setTextTracks(video, [english, descriptive]);
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    expect(english.mode).toBe('disabled');
    expect(descriptive.mode).toBe('showing');
  });

  it('does not replace restored captions with off on loadstart', async () => {
    const storage = new TestStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify({ captions: { value: 'es' } }));

    const video = createMedia();
    const spanish = createTrack('subtitles', 'disabled', { id: 'subtitles0', label: 'Spanish', language: 'es' });
    setTextTracks(video, [spanish]);
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    expect(spanish.mode).toBe('showing');

    setTextTracks(video, [createTrack('subtitles', 'disabled', { id: 'en', label: 'English', language: 'en' })]);
    video.dispatchEvent(new Event('loadstart'));
    flush();

    expect(storage.setItem).not.toHaveBeenCalled();
    expect(JSON.parse(storage.values.get(STORAGE_KEY)!)).toEqual({ captions: { value: 'es' } });
  });

  it('retries captions when options arrive late', async () => {
    const storage = new TestStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify({ captions: { value: 'es' } }));

    const video = createMedia();
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    const spanish = createTrack('subtitles', 'disabled', { id: 'subtitles0', label: 'Spanish', language: 'es' });
    setTextTracks(video, [spanish]);
    video.dispatchEvent(new Event('loadstart'));
    flush();

    expect(spanish.mode).toBe('showing');
  });

  it('clears preferences when another tab removes the storage key', async () => {
    const storage = new TestStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify({ playbackRate: 1.5, volume: { volume: 0.25, muted: true } }));
    setLocalStorage(storage);

    const video = createMedia();
    const store = createStore<PlayerTarget>()(combine(playbackRateFeature, volumeFeature, userPreferencesFeature()));

    store.attach({ media: video, container: null });
    await ready();

    expect(video.playbackRate).toBe(1.5);
    expect(video.volume).toBe(0.25);
    expect(video.muted).toBe(true);
    expect(store.state.userPreferences).toEqual({ playbackRate: 1.5, volume: { volume: 0.25, muted: true } });

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: null,
      })
    );
    flush();

    expect(store.state.userPreferences).toEqual({});
    expect(video.playbackRate).toBe(1);
    expect(video.volume).toBe(1);
    expect(video.muted).toBe(false);
  });

  it('disables captions when the captions preference is removed', async () => {
    const storage = new TestStorage();
    storage.values.set(STORAGE_KEY, JSON.stringify({ captions: { value: 'es' } }));

    const video = createMedia();
    const spanish = createTrack('subtitles', 'disabled', { id: 'subtitles0', label: 'Spanish', language: 'es' });
    setTextTracks(video, [spanish]);
    const store = createPlayerStore(storage);

    store.attach({ media: video, container: null });
    await ready();

    expect(spanish.mode).toBe('showing');

    store.state.setUserPreference('captions', undefined);
    flush();

    expect(spanish.mode).toBe('disabled');
    expect(store.state.userPreferences).toEqual({});
  });

  it('applies valid storage events from another tab', async () => {
    setLocalStorage(new TestStorage());

    const video = createMedia();
    const store = createStore<PlayerTarget>()(combine(playbackRateFeature, userPreferencesFeature()));

    store.attach({ media: video, container: null });
    await ready();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: JSON.stringify({ playbackRate: 1.5 }),
      })
    );
    flush();

    expect(video.playbackRate).toBe(1.5);
  });

  it('ignores unrelated and invalid storage events', async () => {
    setLocalStorage(new TestStorage());

    const video = createMedia();
    const store = createStore<PlayerTarget>()(combine(playbackRateFeature, userPreferencesFeature()));

    store.attach({ media: video, container: null });
    await ready();

    window.dispatchEvent(
      new StorageEvent('storage', {
        key: 'other',
        newValue: JSON.stringify({ playbackRate: 1.5 }),
      })
    );
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: STORAGE_KEY,
        newValue: '{nope',
      })
    );
    flush();

    expect(video.playbackRate).toBe(1);
  });
});
