import { describe, expect, it } from 'vitest';

import { createStore, defineFeature } from '../../index';

describe('store lifecycle integration', () => {
  it('full lifecycle: create → attach → use → detach → destroy', async () => {
    const events: string[] = [];

    class Target extends EventTarget {
      value = 0;
    }

    const feature = defineFeature<Target>()({
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
      getSnapshot: ({ target: t }) => ({ count: t.value }),
      subscribe: ({ target: t, update, signal }) => {
        events.push('subscribe');
        t.addEventListener('change', update, { signal });
        signal.addEventListener('abort', () => events.push('unsubscribe'));
      },
    });

    // Cast to any for test access to dynamic properties
    const store = createStore({
      features: [feature],
      onSetup: () => events.push('setup'),
      onAttach: () => events.push('attach'),
    });

    expect(events).toEqual(['setup']);

    const targetInstance = new Target();
    targetInstance.value = 5;
    const detach = store.attach(targetInstance);

    expect(events).toEqual(['setup', 'subscribe', 'attach']);
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

    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ loading: false }),
      subscribe: () => {},
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

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

    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ fetching: false }),
      subscribe: () => {},
    });

    const store = createStore({ features: [feature] });
    store.attach({});

    const [r3, r1, r2] = await Promise.all([store.fetchTrack(3), store.fetchTrack(1), store.fetchTrack(2)]);

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(r3).toBe(3);
    expect(completionOrder).toEqual([1, 2, 3]);
  });

  it('same key tasks supersede each other', async () => {
    const executed: string[] = [];

    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ running: false }),
      subscribe: () => {},
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

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

    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ playing: false }),
      subscribe: () => {},
    });

    const store = createStore({ features: [feature] });
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
    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ playing: false }),
      subscribe: () => {},
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

    store.attach({});

    const p1 = store.play();
    const p2 = store.play();

    await expect(p1).rejects.toThrow('playback failed');
    await expect(p2).rejects.toThrow('playback failed');
  });

  it('mode: shared allows new task after previous completes', async () => {
    let callCount = 0;

    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ playing: false }),
      subscribe: () => {},
    });

    const store = createStore({ features: [feature] });
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
  it('multiple features merge state correctly', () => {
    const audioFeature = defineFeature<{ volume: number; rate: number }>()({
      state: () => ({ volume: 1 }),
      getSnapshot: ({ target }) => ({ volume: target.volume }),
      subscribe: () => {},
    });

    const playbackFeature = defineFeature<{ volume: number; rate: number }>()({
      state: () => ({ rate: 1 }),
      getSnapshot: ({ target }) => ({ rate: target.rate }),
      subscribe: () => {},
    });

    const store = createStore({
      features: [audioFeature, playbackFeature],
    });

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

    const playbackFeature = defineFeature<MockMedia>()({
      state: ({ task }) => ({
        paused: true,
        play() {
          return task(({ target }) => {
            target.play();
          });
        },
      }),
      getSnapshot: ({ target }) => ({ paused: target.paused }),
      subscribe: ({ target, update, signal }) => {
        target.addEventListener('play', update, { signal });
      },
    });

    const store = createStore({ features: [playbackFeature] });
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

    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ playing: false }),
      subscribe: () => {},
    });

    const store = createStore({ features: [feature] });
    store.attach({});

    await store.meta({ source: 'user', reason: 'button-click' }).play();

    expect(receivedMeta).toMatchObject({
      source: 'user',
      reason: 'button-click',
    });
  });

  it('onTaskStart and onTaskEnd callbacks fire', async () => {
    const events: string[] = [];

    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ count: 0 }),
      subscribe: () => {},
    });

    const store = createStore({
      features: [feature],
      onTaskStart: ({ key }) => events.push(`start:${String(key)}`),
      onTaskEnd: ({ key, error }) => events.push(`end:${String(key)}${error ? ':error' : ''}`),
    });

    store.attach({});

    await store.increment();

    expect(events).toEqual(['start:increment', 'end:increment']);
  });

  it('pending tracks running tasks', async () => {
    const feature = defineFeature<unknown>()({
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
      getSnapshot: () => ({ loading: false }),
      subscribe: () => {},
    });

    const store = createStore({ features: [feature] });
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
  it('target() allows sync mutations without task', () => {
    class Target {
      volume = 1;
    }

    const feature = defineFeature<Target>()({
      state: ({ target }) => ({
        volume: 1,
        setVolume(value: number) {
          target().volume = value;
        },
      }),
      getSnapshot: ({ target: t }) => ({ volume: t.volume }),
      subscribe: () => {},
    });

    const store = createStore({ features: [feature] });
    const targetInstance = new Target();

    store.attach(targetInstance);
    store.setVolume(0.5);

    expect(targetInstance.volume).toBe(0.5);
  });

  it('target() throws when not attached', () => {
    const feature = defineFeature<unknown>()({
      state: ({ target }) => ({
        value: 0,
        doSomething() {
          target();
        },
      }),
      getSnapshot: () => ({ value: 0 }),
      subscribe: () => {},
    });

    const store = createStore({ features: [feature] });

    expect(() => store.doSomething()).toThrow('NO_TARGET');
  });
});
