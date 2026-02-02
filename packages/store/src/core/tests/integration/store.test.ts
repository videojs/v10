import { noop } from '@videojs/utils/function';
import { describe, expect, it } from 'vitest';

import { combine, createStore, defineSlice } from '../../index';

describe('store lifecycle integration', () => {
  it('full lifecycle: create → attach → use → detach → destroy', async () => {
    const events: string[] = [];

    class Target extends EventTarget {
      value = 0;
    }

    const slice = defineSlice<Target>()({
      state: ({ task }) => ({
        count: 0,
        increment() {
          return task(({ target: t }) => {
            t.value++;
            t.dispatchEvent(new Event('change'));
            events.push('increment');
          });
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

    await store.increment();
    expect(store.state.count).toBe(6);
    expect(events).toContain('increment');

    detach();
    expect(events).toContain('unsubscribe');
    expect(store.target).toBeNull();

    store.destroy();
    expect(store.destroyed).toBe(true);
  });
});

describe('task coordination', () => {
  it('cancels option aborts related tasks', async () => {
    const events: string[] = [];

    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        loading: false,
        load() {
          return task({
            key: 'load',
            async handler({ signal }) {
              events.push('load-start');
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                  events.push('load-complete');
                  resolve('loaded');
                }, 100);
                signal.addEventListener('abort', () => {
                  clearTimeout(timeout);
                  events.push('load-aborted');
                  reject(new Error('aborted'));
                });
              });
            },
          });
        },
        stop() {
          return task({
            cancels: ['load'],
            handler() {
              events.push('stop');
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice, { onError: () => {} });

    store.attach({});

    const loadPromise = store.load();
    await new Promise((r) => setTimeout(r, 10));

    await store.stop();

    await loadPromise.catch(() => {});

    expect(events).toContain('load-start');
    expect(events).toContain('load-aborted');
    expect(events).toContain('stop');
    expect(events).not.toContain('load-complete');
  });

  it('different keys enable parallel execution', async () => {
    const completionOrder: number[] = [];

    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        fetching: false,
        fetchTrack(id: number) {
          return task({
            key: `track-${id}`,
            async handler() {
              await new Promise((r) => setTimeout(r, 10 * id));
              completionOrder.push(id);
              return id;
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice);
    store.attach({});

    const [r3, r1, r2] = await Promise.all([store.fetchTrack(3), store.fetchTrack(1), store.fetchTrack(2)]);

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(r3).toBe(3);
    expect(completionOrder).toEqual([1, 2, 3]);
  });

  it('same key tasks supersede each other', async () => {
    const executed: string[] = [];

    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        running: false,
        action(name: string) {
          return task({
            key: 'shared',
            async handler({ signal }) {
              executed.push(`${name}-start`);
              await new Promise((resolve, reject) => {
                const timeout = setTimeout(resolve, 50);
                signal.addEventListener('abort', () => {
                  clearTimeout(timeout);
                  reject(signal.reason);
                });
              });
              executed.push(`${name}-end`);
              return name;
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice, { onError: () => {} });

    store.attach({});

    const p1 = store.action('first');
    const p2 = store.action('second');
    const p3 = store.action('third');

    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();
    await expect(p3).resolves.toBe('third');

    expect(executed).toContain('first-start');
    expect(executed).toContain('second-start');
    expect(executed).toContain('third-start');
    expect(executed).toContain('third-end');
    expect(executed).not.toContain('first-end');
    expect(executed).not.toContain('second-end');
  });

  it('mode: shared allows multiple tasks to share fate', async () => {
    let handlerCallCount = 0;

    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        playing: false,
        play() {
          return task({
            key: 'playback',
            mode: 'shared',
            async handler() {
              handlerCallCount++;
              await new Promise((r) => setTimeout(r, 50));
              return 'playing';
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice);
    store.attach({});

    const p1 = store.play();
    const p2 = store.play();
    const p3 = store.play();

    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe('playing');
    expect(r2).toBe('playing');
    expect(r3).toBe('playing');
    expect(handlerCallCount).toBe(1);
  });

  it('mode: shared rejects all promises together on error', async () => {
    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        playing: false,
        play() {
          return task({
            key: 'playback',
            mode: 'shared',
            async handler() {
              await new Promise((r) => setTimeout(r, 20));
              throw new Error('playback failed');
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice, { onError: () => {} });

    store.attach({});

    const p1 = store.play();
    const p2 = store.play();

    await expect(p1).rejects.toThrow('playback failed');
    await expect(p2).rejects.toThrow('playback failed');
  });

  it('mode: shared allows new task after previous completes', async () => {
    let callCount = 0;

    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        playing: false,
        play() {
          return task({
            key: 'playback',
            mode: 'shared',
            async handler() {
              callCount++;
              await new Promise((r) => setTimeout(r, 10));
              return `call-${callCount}`;
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice);
    store.attach({});

    const p1 = store.play();
    const p2 = store.play();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('call-1');
    expect(r2).toBe('call-1');

    const p3 = store.play();
    const r3 = await p3;
    expect(r3).toBe('call-2');

    expect(callCount).toBe(2);
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
  it('task handler side effect triggers event and state sync', async () => {
    class MockMedia extends EventTarget {
      paused = true;
      play() {
        this.paused = false;
        this.dispatchEvent(new Event('play'));
      }
    }

    const playbackSlice = defineSlice<MockMedia>()({
      state: ({ task }) => ({
        paused: true,
        play() {
          return task(({ target }) => {
            target.play();
          });
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

describe('meta tracing', () => {
  it('store.meta() passes meta to task handlers', async () => {
    let receivedMeta: unknown = null;

    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        playing: false,
        play() {
          return task({
            key: 'playback',
            handler({ meta }) {
              receivedMeta = meta;
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice);
    store.attach({});

    await store.meta({ source: 'user', reason: 'button-click' }).play();

    expect(receivedMeta).toMatchObject({
      source: 'user',
      reason: 'button-click',
    });
  });

  it('onTaskStart and onTaskEnd callbacks fire', async () => {
    const events: string[] = [];

    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        count: 0,
        increment() {
          return task({
            key: 'increment',
            async handler() {
              await new Promise((r) => setTimeout(r, 10));
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice, {
      onTaskStart: ({ key }) => events.push(`start:${String(key)}`),
      onTaskEnd: ({ key, error }) => events.push(`end:${String(key)}${error ? ':error' : ''}`),
    });

    store.attach({});

    await store.increment();

    expect(events).toEqual(['start:increment', 'end:increment']);
  });

  it('pending tracks running tasks', async () => {
    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        loading: false,
        load() {
          return task({
            key: 'load',
            async handler() {
              await new Promise((r) => setTimeout(r, 50));
            },
          });
        },
      }),
    });

    const store = createStore<unknown>()(slice);
    store.attach({});

    expect(store.pending.load).toBeUndefined();

    const promise = store.load();

    expect(store.pending.load).toBeDefined();
    expect(store.pending.load?.key).toBe('load');
    expect(store.pending.load?.startedAt).toBeTypeOf('number');

    await promise;

    expect(store.pending.load).toBeUndefined();
  });
});

describe('sync actions', () => {
  it('task handler allows sync mutations', async () => {
    class Target {
      volume = 1;
    }

    const slice = defineSlice<Target>()({
      state: ({ task }) => ({
        volume: 1,
        setVolume(value: number) {
          return task(({ target }) => {
            target.volume = value;
          });
        },
      }),

      attach({ target: t, set }) {
        set({ volume: t.volume });
      },
    });

    const store = createStore<Target>()(slice);
    const targetInstance = new Target();

    store.attach(targetInstance);
    await store.setVolume(0.5);

    expect(targetInstance.volume).toBe(0.5);
  });

  it('task throws when not attached', async () => {
    const slice = defineSlice<unknown>()({
      state: ({ task }) => ({
        value: 0,
        doSomething() {
          return task(() => {});
        },
      }),
    });

    const store = createStore<unknown>()(slice, { onError: noop });

    await expect(store.doSomething()).rejects.toThrow('NO_TARGET');
  });
});
