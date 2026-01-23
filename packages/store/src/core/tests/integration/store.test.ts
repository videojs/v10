import { describe, expect, it } from 'vitest';

import { CANCEL_ALL, createFeature, createStore } from '../../index';
import { flush } from '../../state';

describe('store lifecycle integration', () => {
  it('full lifecycle: create → attach → use → detach → destroy', async () => {
    const events: string[] = [];

    class Target extends EventTarget {
      value = 0;
    }

    const feature = createFeature<Target>()({
      initialState: { count: 0 },
      getSnapshot: ({ target }) => ({ count: target.value }),
      subscribe: ({ target, update, signal }) => {
        events.push('subscribe');
        target.addEventListener('change', update, { signal });
        signal.addEventListener('abort', () => events.push('unsubscribe'));
      },
      request: {
        increment: (_, { target }) => {
          target.value++;
          target.dispatchEvent(new Event('change'));
          events.push('increment');
        },
      },
    });

    const store = createStore({
      features: [feature],
      onSetup: () => events.push('setup'),
      onAttach: () => events.push('attach'),
    });

    expect(events).toEqual(['setup']);

    const target = new Target();
    target.value = 5;
    const detach = store.attach(target);

    expect(events).toEqual(['setup', 'subscribe', 'attach']);
    expect(store.state.current.count).toBe(5);

    await store.request.increment();
    expect(store.state.current.count).toBe(6);
    expect(events).toContain('increment');

    detach();
    expect(events).toContain('unsubscribe');
    expect(store.target).toBeNull();

    store.destroy();
    expect(store.destroyed).toBe(true);
  });

  it('request with guards', async () => {
    let ready = false;
    const isReady = () => ready;

    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        guardedAction: {
          guard: [isReady],
          handler: (_, _ctx) => 'completed',
        },
      },
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

    store.attach({});

    // Test 1: Guard rejects when not ready
    const failPromise = store.request.guardedAction().catch((e) => e);
    await expect(failPromise).resolves.toMatchObject({ code: 'REJECTED' });

    // Test 2: Guard passes when ready
    ready = true;
    const successPromise = store.request.guardedAction();
    await expect(successPromise).resolves.toBe('completed');
  });
});

describe('request coordination', () => {
  it('cancel option aborts related requests', async () => {
    const events: string[] = [];

    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        load: {
          key: 'load',
          async handler(_, { signal }) {
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
        },
        stop: {
          cancel: ['load'],
          handler: (_, _ctx) => {
            events.push('stop');
          },
        },
      },
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

    store.attach({});

    const loadPromise = store.request.load();
    await new Promise((r) => setTimeout(r, 10));

    await store.request.stop();

    await loadPromise.catch(() => {});

    expect(events).toContain('load-start');
    expect(events).toContain('load-aborted');
    expect(events).toContain('stop');
    expect(events).not.toContain('load-complete');
  });

  it('dynamic keys enable parallel execution', async () => {
    const completionOrder: number[] = [];

    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        fetchTrack: {
          key: (id: number) => `track-${id}`,
          async handler(id: number, _ctx) {
            await new Promise((r) => setTimeout(r, 10 * id));
            completionOrder.push(id);
            return id;
          },
        },
      },
    });

    const store = createStore({
      features: [feature],
    });

    store.attach({});

    // All should run in parallel with different keys
    const [r3, r1, r2] = await Promise.all([
      store.request.fetchTrack(3),
      store.request.fetchTrack(1),
      store.request.fetchTrack(2),
    ]);

    expect(r1).toBe(1);
    expect(r2).toBe(2);
    expect(r3).toBe(3);
    expect(completionOrder).toEqual([1, 2, 3]); // Complete in duration order
  });

  it('same key requests supersede each other', async () => {
    const executed: string[] = [];

    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        action: {
          key: 'shared',
          async handler(name: string, { signal }) {
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
        },
      },
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

    store.attach({});

    const p1 = store.request.action('first');
    const p2 = store.request.action('second');
    const p3 = store.request.action('third');

    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();
    await expect(p3).resolves.toBe('third');

    // All three start immediately (immediate execution)
    expect(executed).toContain('first-start');
    expect(executed).toContain('second-start');
    expect(executed).toContain('third-start');
    // Only third completes (others aborted via signal)
    expect(executed).toContain('third-end');
    expect(executed).not.toContain('first-end');
    expect(executed).not.toContain('second-end');
  });

  it('CANCEL_ALL aborts all pending requests (nuclear reset)', async () => {
    const events: string[] = [];

    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        fetch: {
          key: 'fetch',
          async handler(_, { signal }) {
            events.push('fetch-start');
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                events.push('fetch-complete');
                resolve('fetched');
              }, 100);
              signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                events.push('fetch-aborted');
                reject(signal.reason);
              });
            });
          },
        },
        seek: {
          key: 'seek',
          async handler(_, { signal }) {
            events.push('seek-start');
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                events.push('seek-complete');
                resolve('seeked');
              }, 100);
              signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                events.push('seek-aborted');
                reject(signal.reason);
              });
            });
          },
        },
        load: {
          cancel: CANCEL_ALL,
          handler: () => {
            events.push('load');
          },
        },
      },
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

    store.attach({});

    // Start multiple requests
    const fetchPromise = store.request.fetch();
    const seekPromise = store.request.seek();
    await new Promise((r) => setTimeout(r, 10));

    // Nuclear reset
    await store.request.load();

    await fetchPromise.catch(() => {});
    await seekPromise.catch(() => {});

    expect(events).toContain('fetch-start');
    expect(events).toContain('seek-start');
    expect(events).toContain('fetch-aborted');
    expect(events).toContain('seek-aborted');
    expect(events).toContain('load');
    expect(events).not.toContain('fetch-complete');
    expect(events).not.toContain('seek-complete');
  });

  it('mode: shared allows multiple requests to share fate', async () => {
    let handlerCallCount = 0;

    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        play: {
          key: 'playback',
          mode: 'shared',
          async handler() {
            handlerCallCount++;
            await new Promise((r) => setTimeout(r, 50));
            return 'playing';
          },
        },
      },
    });

    const store = createStore({
      features: [feature],
    });

    store.attach({});

    // Multiple play calls while one is pending
    const p1 = store.request.play();
    const p2 = store.request.play();
    const p3 = store.request.play();

    // All should resolve to the same value (shared fate)
    const [r1, r2, r3] = await Promise.all([p1, p2, p3]);
    expect(r1).toBe('playing');
    expect(r2).toBe('playing');
    expect(r3).toBe('playing');

    // Handler should only be called once (not superseded)
    expect(handlerCallCount).toBe(1);
  });

  it('mode: shared rejects all promises together on error', async () => {
    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        play: {
          key: 'playback',
          mode: 'shared',
          async handler() {
            await new Promise((r) => setTimeout(r, 20));
            throw new Error('playback failed');
          },
        },
      },
    });

    const store = createStore({
      features: [feature],
      onError: () => {},
    });

    store.attach({});

    const p1 = store.request.play();
    const p2 = store.request.play();

    // Both should reject with the same error
    await expect(p1).rejects.toThrow('playback failed');
    await expect(p2).rejects.toThrow('playback failed');
  });

  it('mode: shared allows new request after previous completes', async () => {
    let callCount = 0;

    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        play: {
          key: 'playback',
          mode: 'shared',
          async handler() {
            callCount++;
            await new Promise((r) => setTimeout(r, 10));
            return `call-${callCount}`;
          },
        },
      },
    });

    const store = createStore({
      features: [feature],
    });

    store.attach({});

    // First batch shares fate
    const p1 = store.request.play();
    const p2 = store.request.play();
    const [r1, r2] = await Promise.all([p1, p2]);
    expect(r1).toBe('call-1');
    expect(r2).toBe('call-1');

    // After completion, new request starts fresh
    const p3 = store.request.play();
    const r3 = await p3;
    expect(r3).toBe('call-2');

    expect(callCount).toBe(2);
  });
});

describe('state syncing', () => {
  it('updates only trigger subscriptions for changed keys', async () => {
    const volumeUpdates: number[] = [];
    const mutedUpdates: boolean[] = [];

    class Target extends EventTarget {
      volume = 1;
      muted = false;
    }

    const feature = createFeature<Target>()({
      initialState: {
        volume: 1,
        muted: false,
      },
      getSnapshot: ({ target }) => ({
        volume: target.volume,
        muted: target.muted,
      }),
      subscribe: ({ target, update, signal }) => {
        target.addEventListener('volumechange', update, { signal });
        target.addEventListener('mutechange', update, { signal });
      },
      request: {
        setVolume: (volume: number, { target }) => {
          target.volume = volume;
          target.dispatchEvent(new Event('volumechange'));
        },
        setMuted: (muted: boolean, { target }) => {
          target.muted = muted;
          target.dispatchEvent(new Event('mutechange'));
        },
      },
    });

    const store = createStore({
      features: [feature],
    });

    store.attach(new Target());

    store.state.subscribe(['volume'], () => {
      volumeUpdates.push(store.state.current.volume);
    });

    store.state.subscribe(['muted'], () => {
      mutedUpdates.push(store.state.current.muted);
    });

    await store.request.setVolume(0.5);
    flush();
    await store.request.setMuted(true);
    flush();
    await store.request.setVolume(0.8);
    flush();

    expect(volumeUpdates).toEqual([0.5, 0.8]);
    expect(mutedUpdates).toEqual([true]);
  });

  it('multiple features merge state correctly', () => {
    const audioFeature = createFeature<{ volume: number; rate: number }>()({
      initialState: { volume: 1 },
      getSnapshot: ({ target }) => ({ volume: target.volume }),
      subscribe: () => {},
      request: {},
    });

    const playbackFeature = createFeature<{ volume: number; rate: number }>()({
      initialState: { rate: 1 },
      getSnapshot: ({ target }) => ({ rate: target.rate }),
      subscribe: () => {},
      request: {},
    });

    const store = createStore({
      features: [audioFeature, playbackFeature],
    });

    const target = { volume: 0.5, rate: 1.5 };
    store.attach(target);

    expect(store.state.current).toEqual({
      volume: 0.5,
      rate: 1.5,
    });
  });
});

describe('immediate execution', () => {
  it('request handler side effect triggers event and state sync', async () => {
    // Mock media that dispatches 'play' event when play() is called
    class MockMedia extends EventTarget {
      paused = true;

      play() {
        this.paused = false;
        this.dispatchEvent(new Event('play'));
      }
    }

    const playbackFeature = createFeature<MockMedia>()({
      initialState: { paused: true },
      getSnapshot: ({ target }) => ({ paused: target.paused }),
      subscribe: ({ target, update, signal }) => {
        // State syncs when 'play' event fires
        target.addEventListener('play', update, { signal });
      },
      request: {
        play: (_, { target }) => {
          target.play(); // Triggers event → update → getSnapshot
        },
      },
    });

    const store = createStore({ features: [playbackFeature] });
    const target = new MockMedia();
    store.attach(target);

    expect(store.state.current.paused).toBe(true);

    store.request.play();

    // Validates: handler ran → play() called → event fired → state synced
    expect(target.paused).toBe(false);
    expect(store.state.current.paused).toBe(false);
  });

  it('task is pending synchronously after request', async () => {
    const feature = createFeature<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        action: async () => {
          await new Promise((r) => setTimeout(r, 10));
          return 'done';
        },
      },
    });

    const store = createStore({ features: [feature] });
    store.attach({});

    const promise = store.request.action();

    // Synchronous check - task is pending immediately, no microtask needed
    expect(store.queue.tasks.current.action?.status).toBe('pending');

    await promise;
    expect(store.queue.tasks.current.action?.status).toBe('success');
  });
});
