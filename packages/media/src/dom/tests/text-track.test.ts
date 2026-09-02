import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import type { Media, TextCueLike, TextTrackLike, TextTrackListLike } from '../../core/types';
import {
  addTextTrackCue,
  createTextTrack,
  getActiveTextTrack,
  getTextTrackCues,
  removeTextTrackCue,
  watchActiveTextTrack,
  watchTextTrackCues,
} from '../text-track';

class FakeTextTrack extends EventTarget implements TextTrackLike {
  readonly id = '';
  readonly language = '';
  readonly cues: TextCueLike[] = [];
  readonly activeCues: TextCueLike[] = [];

  mode: TextTrackLike['mode'] = 'disabled';

  constructor(
    readonly kind: string,
    readonly label = ''
  ) {
    super();
  }

  addCue(cue: TextCueLike): void {
    this.cues.push(cue);
  }

  removeCue(cue: TextCueLike): void {
    const index = this.cues.indexOf(cue);

    if (index >= 0) this.cues.splice(index, 1);
  }
}

class FakeTextTrackList extends EventTarget implements TextTrackListLike {
  readonly [index: number]: TextTrackLike;
  readonly #tracks: TextTrackLike[] = [];

  get length(): number {
    return this.#tracks.length;
  }

  add(track: TextTrackLike): void {
    this.#tracks.push(track);
    this.#syncIndexes();
    this.dispatchEvent(new Event('addtrack'));
  }

  remove(track: TextTrackLike): void {
    const index = this.#tracks.indexOf(track);
    if (index < 0) return;

    this.#tracks.splice(index, 1);
    this.#syncIndexes();
    this.dispatchEvent(new Event('removetrack'));
  }

  [Symbol.iterator](): Iterator<TextTrackLike> {
    return this.#tracks[Symbol.iterator]();
  }

  #syncIndexes(): void {
    for (const key of Object.keys(this)) {
      if (/^\d+$/.test(key)) Reflect.deleteProperty(this, key);
    }

    for (const [index, track] of this.#tracks.entries()) {
      Object.defineProperty(this, index, { configurable: true, value: track });
    }
  }
}

class FakeMedia extends EventTarget implements Media {
  readonly textTracks = new FakeTextTrackList();

  addTextTrack(kind: TextTrackLike['kind'], label?: string): FakeTextTrack {
    const track = new FakeTextTrack(kind, label);

    this.textTracks.add(track);

    return track;
  }

  removeTextTrack(track: TextTrackLike): void {
    this.textTracks.remove(track);
  }

  play(): Promise<void> {
    return Promise.resolve();
  }
}

describe('createTextTrack', () => {
  const trackDescriptor = Object.getOwnPropertyDescriptor(HTMLTrackElement.prototype, 'track');
  const readyStateDescriptor = Object.getOwnPropertyDescriptor(HTMLTrackElement.prototype, 'readyState');
  const readyStates = new WeakMap<HTMLTrackElement, number>();
  const tracks = new WeakMap<HTMLTrackElement, FakeTextTrack>();

  function mockTrackElements() {
    Object.defineProperty(HTMLTrackElement.prototype, 'track', {
      configurable: true,
      get() {
        let track = tracks.get(this);

        if (!track) {
          track = new FakeTextTrack(this.kind, this.label);
          tracks.set(this, track);
        }

        return track;
      },
    });
    Object.defineProperty(HTMLTrackElement.prototype, 'readyState', {
      configurable: true,
      get() {
        return readyStates.get(this) ?? 0;
      },
    });
  }

  function settle(element: HTMLTrackElement, type: 'load' | 'error') {
    readyStates.set(element, type === 'load' ? 2 : 3);
    element.dispatchEvent(new Event(type));
  }

  afterEach(() => {
    for (const [name, descriptor] of [
      ['track', trackDescriptor],
      ['readyState', readyStateDescriptor],
    ] as const) {
      if (descriptor) Object.defineProperty(HTMLTrackElement.prototype, name, descriptor);
      else Reflect.deleteProperty(HTMLTrackElement.prototype, name);
    }
  });

  it('creates a hidden track and removes it when destroyed', () => {
    const media = new FakeMedia();
    const handle = createTextTrack(media, { kind: 'metadata', label: 'Ads' });

    expect(handle?.track).toMatchObject({ kind: 'metadata', label: 'Ads', mode: 'hidden' });
    expect(media.textTracks.length).toBe(1);

    handle?.destroy();
    handle?.destroy();

    expect(handle?.track.mode).toBe('disabled');
    expect(media.textTracks.length).toBe(0);
  });

  it('notifies cue observers when cues are written through the handle', () => {
    const media = new FakeMedia();
    const handle = createTextTrack(media, { kind: 'metadata' })!;
    const cue = { startTime: 0, endTime: 1 };
    const onChange = vi.fn();

    watchTextTrackCues(media, handle.track, false, onChange);
    handle.addCue(cue);

    expect(onChange).toHaveBeenLastCalledWith([cue]);

    handle.removeCue(cue);

    expect(onChange).toHaveBeenLastCalledWith([]);
  });

  it('queues cue writes until the backing element has loaded', () => {
    mockTrackElements();

    const video = document.createElement('video');
    const handle = createTextTrack(video, { kind: 'metadata', label: 'Ads' })!;
    const element = video.querySelector('track')!;
    const kept = { startTime: 0, endTime: 1 };
    const dropped = { startTime: 1, endTime: 2 };
    const onChange = vi.fn();

    watchTextTrackCues(video, handle.track, false, onChange);

    expect(handle.track.mode).toBe('hidden');
    expect(element).toMatchObject({ kind: 'metadata', label: 'Ads' });

    handle.addCue(kept);
    handle.addCue(dropped);
    handle.removeCue(dropped);

    expect(handle.track.cues).toEqual([]);

    settle(element, 'error');

    expect(handle.track.cues).toEqual([kept]);
    expect(onChange).toHaveBeenLastCalledWith([kept]);

    handle.destroy();

    expect(video.querySelector('track')).toBeNull();
    expect(handle.track.mode).toBe('disabled');
  });

  it('applies a requested disabled mode after the element load settles', () => {
    mockTrackElements();

    const video = document.createElement('video');
    const handle = createTextTrack(video, { kind: 'chapters', mode: 'disabled' })!;
    const element = video.querySelector('track')!;

    expect(handle.track.mode).toBe('hidden');

    settle(element, 'load');

    expect(handle.track.mode).toBe('disabled');
  });

  it('writes cues immediately when no backing element exists', () => {
    const media = new FakeMedia();
    const handle = createTextTrack(media, { kind: 'metadata', mode: 'showing' })!;
    const cue = { startTime: 0, endTime: 1 };

    handle.addCue(cue);

    expect(handle.track.mode).toBe('showing');
    expect(handle.track.cues).toEqual([cue]);
  });
});

describe('addTextTrackCue', () => {
  it('adds the cue and notifies observers of the same track only', () => {
    const track = new FakeTextTrack('metadata');
    const other = new FakeTextTrack('metadata');
    const cue = { startTime: 0, endTime: 1 };
    const onChange = vi.fn();
    const onOtherChange = vi.fn();

    const stop = watchTextTrackCues(null, track, false, onChange);

    watchTextTrackCues(null, other, false, onOtherChange);
    addTextTrackCue(track, cue);

    expect(track.cues).toEqual([cue]);
    expect(onChange).toHaveBeenLastCalledWith([cue]);
    expect(onOtherChange).toHaveBeenCalledTimes(1);

    stop();
    removeTextTrackCue(track, cue);

    expect(track.cues).toEqual([]);
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('getActiveTextTrack', () => {
  it('prefers showing tracks, falls back to hidden tracks, and ignores disabled tracks', () => {
    const media = new FakeMedia();
    const captions = media.addTextTrack('captions');
    const chapters = media.addTextTrack('chapters');
    const showingChapters = media.addTextTrack('chapters');

    captions.mode = 'disabled';
    chapters.mode = 'hidden';
    showingChapters.mode = 'showing';

    expect(getActiveTextTrack(media, ['captions', 'chapters'])).toBe(showingChapters);

    showingChapters.mode = 'disabled';

    expect(getActiveTextTrack(media, ['captions', 'chapters'])).toBe(chapters);
  });
});

describe('watchActiveTextTrack', () => {
  it('notifies when the active track changes and stops after cleanup', () => {
    const media = new FakeMedia();
    const captions = media.addTextTrack('captions');
    const onChange = vi.fn();
    const stop = watchActiveTextTrack(media, 'captions', onChange);

    expect(onChange).toHaveBeenLastCalledWith(null);

    captions.mode = 'showing';
    media.textTracks.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenLastCalledWith(captions);

    stop();
    captions.mode = 'disabled';
    media.textTracks.dispatchEvent(new Event('change'));

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});

describe('getTextTrackCues', () => {
  it('returns snapshots of all and active cues', () => {
    const track = new FakeTextTrack('metadata');
    const first = { startTime: 0, endTime: 1 };
    const second = { startTime: 1, endTime: 2 };

    track.cues.push(first, second);
    track.activeCues.push(second);

    expect(getTextTrackCues(track)).toEqual([first, second]);
    expect(getTextTrackCues(track, true)).toEqual([second]);
  });
});

describe('watchTextTrackCues', () => {
  it('notifies with fresh cue snapshots on cue changes', () => {
    const media = new FakeMedia();
    const track = new FakeTextTrack('metadata');
    const cue = { startTime: 0, endTime: 1 };
    const onChange = vi.fn();

    const stop = watchTextTrackCues(media, track, false, onChange);

    expect(onChange).toHaveBeenLastCalledWith([]);

    track.cues.push(cue);
    track.dispatchEvent(new Event('cuechange'));

    expect(onChange).toHaveBeenLastCalledWith([cue]);

    stop();
    track.cues.length = 0;
    track.dispatchEvent(new Event('cuechange'));

    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
