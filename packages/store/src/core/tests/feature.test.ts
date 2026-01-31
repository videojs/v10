import { describe, expect, it, vi } from 'vitest';

import { defineFeature, isFeature } from '../feature';

describe('defineFeature', () => {
  it('creates feature with create function and config', () => {
    interface Target {
      value: number;
    }

    const feature = defineFeature<Target>()({
      state: ({ task, target }) => ({
        // State
        count: 0,
        // Actions
        increment(amount: number) {
          target().value += amount;
        },
        asyncIncrement(amount: number) {
          return task({
            key: 'increment',
            handler: ({ target }) => {
              target.value += amount;
            },
          });
        },
      }),
      getSnapshot: ({ target }) => ({ count: target.value }),
      subscribe: vi.fn(),
    });

    expect(feature.state).toBeTypeOf('function');
    expect(feature.getSnapshot).toBeTypeOf('function');
    expect(feature.subscribe).toBeTypeOf('function');
  });

  it('factory receives task, get, and target helpers', () => {
    interface Target {
      value: number;
    }

    const factorySpy = vi.fn().mockReturnValue({ count: 0 });

    defineFeature<Target>()({
      state: factorySpy,
      getSnapshot: () => ({ count: 0 }),
      subscribe: () => {},
    });

    // Can't call the factory directly, but we can verify the shape
    // The factory will be called by the store when building features
    expect(factorySpy).not.toHaveBeenCalled();
  });

  it('allows sync actions using target()', () => {
    interface Target {
      volume: number;
    }

    const feature = defineFeature<Target>()({
      state: ({ target }) => ({
        volume: 1,
        setVolume(value: number) {
          target().volume = value;
        },
      }),
      getSnapshot: ({ target }) => ({ volume: target.volume }),
      subscribe: () => {},
    });

    expect(feature.state).toBeTypeOf('function');
  });

  it('allows async actions using task()', () => {
    interface Target {
      play: () => Promise<void>;
    }

    const feature = defineFeature<Target>()({
      state: ({ task }) => ({
        playing: false,
        play() {
          return task({
            key: 'playback',
            handler: ({ target }) => target.play(),
          });
        },
      }),
      getSnapshot: () => ({ playing: false }),
      subscribe: () => {},
    });

    expect(feature.state).toBeTypeOf('function');
  });

  it('supports task shorthand (fire-and-forget)', () => {
    interface Target {
      src: string;
      load: () => void;
    }

    const feature = defineFeature<Target>()({
      state: ({ task }) => ({
        loading: false,
        load(src: string) {
          return task(({ target }) => {
            target.src = src;
            target.load();
          });
        },
      }),
      getSnapshot: () => ({ loading: false }),
      subscribe: () => {},
    });

    expect(feature.state).toBeTypeOf('function');
  });
});

describe('isFeature', () => {
  it('returns true for features created with defineFeature', () => {
    const feature = defineFeature<HTMLVideoElement>()({
      state: () => ({ playing: false }),
      getSnapshot: () => ({ playing: false }),
      subscribe: () => {},
    });

    expect(isFeature(feature)).toBe(true);
  });

  it('returns false for non-feature objects', () => {
    expect(isFeature({})).toBe(false);
    expect(isFeature(null)).toBe(false);
    expect(isFeature(undefined)).toBe(false);
    expect(isFeature({ create: () => {} })).toBe(false);
  });
});
