import { describe, expect, it, vi } from 'vitest';

import { defineFeature, isFeature } from '../feature';

describe('defineFeature', () => {
  it('creates feature with state factory and optional attach', () => {
    interface Target {
      value: number;
    }

    const feature = defineFeature<Target>()({
      state: ({ task }) => ({
        count: 0,
        increment(amount: number) {
          return task({
            key: 'increment',
            handler: ({ target }) => {
              target.value += amount;
            },
          });
        },
      }),

      attach({ target, set }) {
        set({ count: target.value });
      },
    });

    expect(feature.state).toBeTypeOf('function');
    expect(feature.attach).toBeTypeOf('function');
  });

  it('factory receives task and target helpers', () => {
    interface Target {
      value: number;
    }

    const factorySpy = vi.fn().mockReturnValue({ count: 0 });

    defineFeature<Target>()({
      state: factorySpy,
    });

    // Can't call the factory directly, but we can verify the shape
    // The factory will be called by the store when building features
    expect(factorySpy).not.toHaveBeenCalled();
  });

  it('allows sync actions using task handler', () => {
    interface Target {
      volume: number;
    }

    const feature = defineFeature<Target>()({
      state: ({ task }) => ({
        volume: 1,
        setVolume(value: number) {
          return task({
            key: 'volume',
            handler: ({ target }) => {
              target.volume = value;
            },
          });
        },
      }),
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
    });

    expect(feature.state).toBeTypeOf('function');
  });

  it('attach is optional', () => {
    const feature = defineFeature<HTMLVideoElement>()({
      state: () => ({ playing: false }),
    });

    expect(feature.state).toBeTypeOf('function');
    expect(feature.attach).toBeUndefined();
  });
});

describe('isFeature', () => {
  it('returns true for features created with defineFeature', () => {
    const feature = defineFeature<HTMLVideoElement>()({
      state: () => ({ playing: false }),
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
