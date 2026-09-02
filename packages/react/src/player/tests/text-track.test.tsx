import { act, cleanup, renderHook } from '@testing-library/react';
import type { Media, TextCueLike, TextTrackKind, TextTrackLike, TextTrackListLike } from '@videojs/media';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vite-plus/test';

import { createMockStore } from '../../testing/mocks';
import { PlayerContextProvider, type PlayerContextValue } from '../context';
import { useActiveTextCues, useActiveTextTrack, useCreateTextTrack, useTextCues } from '../text-track';

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
    this.dispatchEvent(new Event('addtrack'));
  }

  remove(track: TextTrackLike): void {
    const index = this.#tracks.indexOf(track);
    if (index < 0) return;

    this.#tracks.splice(index, 1);
    this.dispatchEvent(new Event('removetrack'));
  }

  [Symbol.iterator](): Iterator<TextTrackLike> {
    return this.#tracks[Symbol.iterator]();
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

function createWrapper(media: FakeMedia) {
  const store: unknown = createMockStore();

  const value: PlayerContextValue = {
    // SAFETY: the mock implements the player store behavior used by PlayerContextProvider.
    store: store as PlayerContextValue['store'],
    media,
    setMedia: vi.fn(),
    container: null,
    setContainer: vi.fn(),
  };

  return function Wrapper({ children }: { children: ReactNode }) {
    return <PlayerContextProvider value={value}>{children}</PlayerContextProvider>;
  };
}

afterEach(cleanup);

describe('useCreateTextTrack', () => {
  it('creates a track for the component lifetime', () => {
    const media = new FakeMedia();
    const { result, unmount } = renderHook(() => useCreateTextTrack({ kind: 'metadata', label: 'Ads' }), {
      wrapper: createWrapper(media),
    });

    expect(result.current?.track).toMatchObject({ kind: 'metadata', label: 'Ads', mode: 'hidden' });
    expect(media.textTracks.length).toBe(1);

    const track = result.current?.track;

    unmount();

    expect(track?.mode).toBe('disabled');
    expect(media.textTracks.length).toBe(0);
  });

  it('replaces the owned track when its options change', () => {
    const media = new FakeMedia();
    const { result, rerender } = renderHook(({ kind }: { kind: TextTrackKind }) => useCreateTextTrack({ kind }), {
      initialProps: { kind: 'metadata' },
      wrapper: createWrapper(media),
    });
    const first = result.current?.track;

    rerender({ kind: 'chapters' });

    expect(first?.mode).toBe('disabled');
    expect(result.current?.track).toMatchObject({ kind: 'chapters', mode: 'hidden' });
    expect(media.textTracks.length).toBe(1);
  });

  it('refreshes cue observers when cues are written through the handle', () => {
    const media = new FakeMedia();
    const cue = { startTime: 0, endTime: 1 };
    const { result } = renderHook(
      () => {
        const created = useCreateTextTrack({ kind: 'metadata' });
        const cues = useTextCues(created?.track ?? null);

        return { created, cues };
      },
      { wrapper: createWrapper(media) }
    );

    expect(result.current.cues).toEqual([]);

    act(() => result.current.created?.addCue(cue));

    expect(result.current.cues).toEqual([cue]);

    act(() => result.current.created?.removeCue(cue));

    expect(result.current.cues).toEqual([]);
  });
});

describe('useActiveTextTrack', () => {
  it('observes hidden tracks and reacts to mode changes', () => {
    const media = new FakeMedia();
    const track = media.addTextTrack('chapters');

    track.mode = 'hidden';

    const { result, rerender } = renderHook(() => useActiveTextTrack(['captions', 'chapters']), {
      wrapper: createWrapper(media),
    });

    expect(result.current).toBe(track);

    rerender();

    expect(result.current).toBe(track);

    act(() => {
      track.mode = 'disabled';
      media.textTracks.dispatchEvent(new Event('change'));
    });

    expect(result.current).toBeNull();
  });

  it('keeps one subscription across renders with an inline kind array', () => {
    const media = new FakeMedia();
    const addEventListener = vi.spyOn(media.textTracks, 'addEventListener');
    const { rerender } = renderHook(() => useActiveTextTrack(['captions', 'subtitles']), {
      wrapper: createWrapper(media),
    });
    const initialCalls = addEventListener.mock.calls.length;

    rerender();
    rerender();

    expect(addEventListener.mock.calls.length).toBe(initialCalls);
  });
});

describe('useTextCues', () => {
  it('observes all and active cue snapshots', () => {
    const media = new FakeMedia();
    const track = media.addTextTrack('metadata');
    const first = { startTime: 0, endTime: 1 };
    const second = { startTime: 1, endTime: 2 };

    track.cues.push(first);
    track.activeCues.push(first);

    const { result } = renderHook(() => ({ all: useTextCues(track), active: useActiveTextCues(track) }), {
      wrapper: createWrapper(media),
    });

    expect(result.current).toEqual({ all: [first], active: [first] });

    act(() => {
      track.cues.push(second);
      track.activeCues.splice(0, 1, second);
      track.dispatchEvent(new Event('cuechange'));
    });

    expect(result.current).toEqual({ all: [first, second], active: [second] });
  });
});
