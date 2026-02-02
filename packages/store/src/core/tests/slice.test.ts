import { describe, expect, it, vi } from 'vitest';

import { defineSlice } from '../slice';

describe('defineSlice', () => {
  it('creates slice with state factory and optional attach', () => {
    interface Target {
      value: number;
    }

    const slice = defineSlice<Target>()({
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

    expect(slice.state).toBeTypeOf('function');
    expect(slice.attach).toBeTypeOf('function');
  });

  it('factory receives task and target helpers', () => {
    interface Target {
      value: number;
    }

    const factorySpy = vi.fn().mockReturnValue({ count: 0 });

    defineSlice<Target>()({
      state: factorySpy,
    });

    expect(factorySpy).not.toHaveBeenCalled();
  });

  it('allows sync actions using task handler', () => {
    interface Target {
      volume: number;
    }

    const slice = defineSlice<Target>()({
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

    expect(slice.state).toBeTypeOf('function');
  });

  it('allows async actions using task()', () => {
    interface Target {
      play: () => Promise<void>;
    }

    const slice = defineSlice<Target>()({
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

    expect(slice.state).toBeTypeOf('function');
  });

  it('supports task shorthand (fire-and-forget)', () => {
    interface Target {
      src: string;
      load: () => void;
    }

    const slice = defineSlice<Target>()({
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
