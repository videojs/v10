import { describe, expect, it, vi } from 'vitest';

import { defineSlice } from '../slice';

describe('defineSlice', () => {
  it('creates slice with state factory and optional attach', () => {
    interface Target {
      value: number;
    }

    const slice = defineSlice<Target>()({
      state: ({ target }) => ({
        count: 0,
        increment(amount: number) {
          target().value += amount;
        },
      }),

      attach({ target, set }) {
        set({ count: target.value });
      },
    });

    expect(slice.state).toBeTypeOf('function');
    expect(slice.attach).toBeTypeOf('function');
  });

  it('factory receives target helper', () => {
    interface Target {
      value: number;
    }

    const factorySpy = vi.fn().mockReturnValue({ count: 0 });

    defineSlice<Target>()({
      state: factorySpy,
    });

    expect(factorySpy).not.toHaveBeenCalled();
  });

  it('allows sync actions using target()', () => {
    interface Target {
      volume: number;
    }

    const slice = defineSlice<Target>()({
      state: ({ target }) => ({
        volume: 1,
        setVolume(value: number) {
          target().volume = value;
        },
      }),
    });

    expect(slice.state).toBeTypeOf('function');
  });

  it('allows async actions using target()', () => {
    interface Target {
      play: () => Promise<void>;
    }

    const slice = defineSlice<Target>()({
      state: ({ target }) => ({
        playing: false,
        play() {
          return target().play();
        },
      }),
    });

    expect(slice.state).toBeTypeOf('function');
  });

  it('attach is optional', () => {
    const slice = defineSlice<HTMLVideoElement>()({
      state: () => ({ playing: false }),
    });

    expect(slice.state).toBeTypeOf('function');
    expect(slice.attach).toBeUndefined();
  });
});
