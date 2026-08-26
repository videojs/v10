import { describe, expect, it, vi } from 'vite-plus/test';

import type { Media, TextCueLike, TextTrackLike, TextTrackListLike } from '../../core/types';
import {
  createTextTrack,
  getActiveTextTrack,
  getTextTrackCues,
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
