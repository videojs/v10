import { describe, expect, it } from 'vitest';

import { combine, createStore, defineSlice } from '../../index';

describe('store lifecycle integration', () => {
  it('full lifecycle: create → attach → use → detach → destroy', () => {
    const events: string[] = [];

    class Target extends EventTarget {
      value = 0;
    }

    const slice = defineSlice<Target>()({
      state: ({ target }) => ({
        count: 0,
        increment() {
          target().value++;
          target().dispatchEvent(new Event('change'));
          events.push('increment');
        },
      }),

      attach({ target: t, signal, set }) {
        events.push('attach-slice');
        set({ count: t.value });

        t.addEventListener('change', () => set({ count: t.value }), { signal });
        signal.addEventListener('abort', () => events.push('unsubscribe'));
      },
    });

    const store = createStore<Target>()(slice, {
      onSetup: () => events.push('setup'),
      onAttach: () => events.push('attach'),
    });

    expect(events).toEqual(['setup']);

    const targetInstance = new Target();
    targetInstance.value = 5;
    const detach = store.attach(targetInstance);

    expect(events).toEqual(['setup', 'attach-slice', 'attach']);
    expect(store.state.count).toBe(5);

    store.increment();
    expect(store.state.count).toBe(6);
    expect(events).toContain('increment');

    detach();
    expect(events).toContain('unsubscribe');
    expect(store.target).toBeNull();

    store.destroy();
    expect(store.destroyed).toBe(true);
  });
});

describe('state syncing', () => {
  it('multiple slices merge state correctly', () => {
    const audioSlice = defineSlice<{ volume: number; rate: number }>()({
      state: () => ({ volume: 1 }),

      attach({ target, set }) {
        set({ volume: target.volume });
      },
    });

    const playbackSlice = defineSlice<{ volume: number; rate: number }>()({
      state: () => ({ rate: 1 }),

      attach({ target, set }) {
        set({ rate: target.rate });
      },
    });

    const store = createStore<{ volume: number; rate: number }>()(combine(audioSlice, playbackSlice));

    const target = { volume: 0.5, rate: 1.5 };
    store.attach(target);

    expect(store.state).toMatchObject({
      volume: 0.5,
      rate: 1.5,
    });
  });
});

describe('immediate execution', () => {
  it('action side effect triggers event and state sync', () => {
    class MockMedia extends EventTarget {
      paused = true;
      play() {
        this.paused = false;
        this.dispatchEvent(new Event('play'));
      }
    }

    const playbackSlice = defineSlice<MockMedia>()({
      state: ({ target }) => ({
        paused: true,
        play() {
          target().play();
        },
      }),

      attach({ target, signal, set }) {
        set({ paused: target.paused });

        target.addEventListener('play', () => set({ paused: target.paused }), { signal });
      },
    });

    const store = createStore<MockMedia>()(playbackSlice);
    const target = new MockMedia();
    store.attach(target);

    expect(store.state.paused).toBe(true);

    store.play();

    expect(target.paused).toBe(false);
    expect(store.state.paused).toBe(false);
  });
});

describe('sync actions', () => {
  it('allows sync mutations on target', () => {
    class Target {
      volume = 1;
    }

    const slice = defineSlice<Target>()({
      state: ({ target }) => ({
        volume: 1,
        setVolume(value: number) {
          target().volume = value;
        },
      }),

      attach({ target: t, set }) {
        set({ volume: t.volume });
      },
    });

    const store = createStore<Target>()(slice);
    const targetInstance = new Target();

    store.attach(targetInstance);
    store.setVolume(0.5);

    expect(targetInstance.volume).toBe(0.5);
  });

  it('throws when not attached', () => {
    const slice = defineSlice<unknown>()({
      state: ({ target }) => ({
        value: 0,
        doSomething() {
          target(); // Will throw NO_TARGET
        },
      }),
    });

    const store = createStore<unknown>()(slice, { onError: () => {} });

    expect(() => store.doSomething()).toThrow('NO_TARGET');
  });
});
