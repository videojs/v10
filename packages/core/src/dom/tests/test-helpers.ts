import type { StateContext } from '@videojs/store';
import { combine, createStore } from '@videojs/store';
import type { SliderState } from '../../core/ui/slider/slider-core';
import type { TimeSliderState } from '../../core/ui/time-slider/time-slider-core';
import type { AnyPlayerFeature, AnyPlayerStore, PlayerTarget } from '../player';

// ---------------------------------------------------------------------------
// Mock Player State
// ---------------------------------------------------------------------------

const SET_TEST_STATE = Symbol('setTestPlayerState');

interface TestStateAction {
  [SET_TEST_STATE](partial: Record<string, unknown>): void;
}

export type TestPlayerStore = AnyPlayerStore & {
  setState(partial: Record<string, unknown>): void;
};

/** Creates a marked player store from real features with test-only state overrides. */
export function createTestPlayerStore(
  features: readonly AnyPlayerFeature[],
  initialState: Record<string, unknown> = {}
): TestPlayerStore {
  const testStateFeature = {
    name: 'testState',
    state: ({ set }: StateContext<PlayerTarget>): TestStateAction => ({
      [SET_TEST_STATE]: (partial) => set(partial),
    }),
  };
  const store = createStore<PlayerTarget>()(combine(...features, testStateFeature)) as AnyPlayerStore & TestStateAction;

  store[SET_TEST_STATE](initialState);

  return Object.assign(store, {
    setState: (partial: Record<string, unknown>) => store[SET_TEST_STATE](partial),
  });
}

// ---------------------------------------------------------------------------
// Mock Video
// ---------------------------------------------------------------------------

interface MockVideoOverrides {
  paused?: boolean;
  ended?: boolean;
  currentTime?: number;
  duration?: number;
  readyState?: number;
  volume?: number;
  muted?: boolean;
  currentSrc?: string;
  src?: string;
  buffered?: TimeRanges;
  seekable?: TimeRanges;
}

/**
 * Create an `HTMLVideoElement` with overridable properties.
 *
 * Readonly properties (`paused`, `ended`, `readyState`, `duration`, `currentSrc`,
 * `buffered`, `seekable`) are set via `Object.defineProperty`.
 * Writable properties (`currentTime`, `volume`, `muted`, `src`) are assigned directly.
 */
export function createMockVideo(overrides: MockVideoOverrides = {}): HTMLVideoElement {
  const video = document.createElement('video');

  const readonly: Record<string, unknown> = {
    paused: overrides.paused,
    ended: overrides.ended,
    readyState: overrides.readyState,
    duration: overrides.duration,
    currentSrc: overrides.currentSrc,
    buffered: overrides.buffered,
    seekable: overrides.seekable,
  };

  for (const [key, value] of Object.entries(readonly)) {
    if (value !== undefined) {
      Object.defineProperty(video, key, { value, configurable: true });
    }
  }

  if (overrides.currentTime !== undefined) video.currentTime = overrides.currentTime;
  if (overrides.volume !== undefined) video.volume = overrides.volume;
  if (overrides.muted !== undefined) video.muted = overrides.muted;
  if (overrides.src !== undefined) video.src = overrides.src;

  return video;
}

// ---------------------------------------------------------------------------
// Mock TimeRanges
// ---------------------------------------------------------------------------

/** Create a mock `TimeRanges` from an array of `[start, end]` tuples. */
export function createTimeRanges(ranges: Array<[number, number]>): TimeRanges {
  return {
    length: ranges.length,
    start(index: number): number {
      const range = ranges[index];
      if (index < 0 || index >= ranges.length || !range) {
        throw new DOMException('Index out of range', 'IndexSizeError');
      }
      return range[0];
    },
    end(index: number): number {
      const range = ranges[index];
      if (index < 0 || index >= ranges.length || !range) {
        throw new DOMException('Index out of range', 'IndexSizeError');
      }
      return range[1];
    },
  };
}

// ---------------------------------------------------------------------------
// Mock Slider State
// ---------------------------------------------------------------------------

export function createSliderState(overrides: Partial<SliderState> = {}): SliderState {
  return {
    value: 50,
    fillPercent: 50,
    pointerPercent: 30,
    dragging: false,
    pointing: false,
    interactive: false,
    orientation: 'horizontal',
    disabled: false,
    thumbAlignment: 'center',
    ...overrides,
  };
}

export function createTimeSliderState(overrides: Partial<TimeSliderState> = {}): TimeSliderState {
  return {
    ...createSliderState(),
    currentTime: 30,
    duration: 60,
    seeking: false,
    bufferPercent: 75,
    ...overrides,
  };
}
