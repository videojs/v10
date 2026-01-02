import { describe, expect, it, vi } from 'vitest';

import { createSlice, createStore, delay } from '../../src';

describe('store lifecycle integration', () => {
  it('full lifecycle: create → attach → use → detach → destroy', async () => {
    const events: string[] = [];

    class Target extends EventTarget {
      value = 0;
    }

    const slice = createSlice<Target>()({
      initialState: { count: 0 },
      getSnapshot: ({ target }) => ({ count: target.value }),
      subscribe: ({ target, update, signal }) => {
        events.push('subscribe');
        target.addEventListener('change', () => update(), { signal });
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
      slices: [slice],
      onSetup: () => events.push('setup'),
      onAttach: () => events.push('attach'),
    });

    expect(events).toEqual(['setup']);

    const target = new Target();
    target.value = 5;
    const detach = store.attach(target);

    expect(events).toEqual(['setup', 'subscribe', 'attach']);
    expect(store.state.count).toBe(5);

    await store.request.increment();
    expect(store.state.count).toBe(6);
    expect(events).toContain('increment');

    detach();
    expect(events).toContain('unsubscribe');
    expect(store.target).toBeNull();

    store.destroy();
    expect(store.destroyed).toBe(true);
  });

  it('request with guards and scheduling', async () => {
    vi.useFakeTimers();

    let ready = false;
    const isReady = () => ready;

    const slice = createSlice<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        delayedAction: {
          schedule: delay(100),
          guard: [isReady],
          handler: (_, _ctx) => 'completed',
        },
      },
    });

    const store = createStore({
      slices: [slice],
      onError: () => {},
    });

    store.attach({});

    // Test 1: Guard rejects when not ready
    const failPromise = store.request.delayedAction().catch(e => e);
    await vi.runAllTimersAsync();
    await expect(failPromise).resolves.toMatchObject({ message: 'Rejected' });

    // Test 2: Guard passes when ready
    ready = true;
    const successPromise = store.request.delayedAction();
    await vi.runAllTimersAsync();
    await expect(successPromise).resolves.toBe('completed');

    vi.useRealTimers();
  });
});

describe('request coordination', () => {
  it('cancel option aborts related requests', async () => {
    const events: string[] = [];

    const slice = createSlice<unknown>()({
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
      slices: [slice],
      onError: () => {},
    });

    store.attach({});

    const loadPromise = store.request.load();
    await new Promise(r => setTimeout(r, 10));

    await store.request.stop();

    await loadPromise.catch(() => {});

    expect(events).toContain('load-start');
    expect(events).toContain('load-aborted');
    expect(events).toContain('stop');
    expect(events).not.toContain('load-complete');
  });

  it('dynamic keys enable parallel execution', async () => {
    const completionOrder: number[] = [];

    const slice = createSlice<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        fetchTrack: {
          key: (id: number) => `track-${id}`,
          async handler(id: number, _ctx) {
            await new Promise(r => setTimeout(r, 10 * id));
            completionOrder.push(id);
            return id;
          },
        },
      },
    });

    const store = createStore({
      slices: [slice],
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

    const slice = createSlice<unknown>()({
      initialState: {},
      getSnapshot: () => ({}),
      subscribe: () => {},
      request: {
        action: {
          key: 'shared',
          async handler(name: string, _ctx) {
            executed.push(`${name}-start`);
            await new Promise(r => setTimeout(r, 50));
            executed.push(`${name}-end`);
            return name;
          },
        },
      },
    });

    const store = createStore({
      slices: [slice],
      onError: () => {},
    });

    store.attach({});

    const p1 = store.request.action('first');
    const p2 = store.request.action('second');
    const p3 = store.request.action('third');

    await expect(p1).rejects.toThrow();
    await expect(p2).rejects.toThrow();
    await expect(p3).resolves.toBe('third');

    expect(executed).toContain('third-start');
    expect(executed).toContain('third-end');
    expect(executed).not.toContain('first-end');
    expect(executed).not.toContain('second-end');
  });
});

describe('state syncing', () => {
  it('partial updates only trigger relevant subscriptions', async () => {
    const volumeUpdates: number[] = [];
    const mutedUpdates: boolean[] = [];

    class Target extends EventTarget {
      volume = 1;
      muted = false;
    }

    const slice = createSlice<Target>()({
      initialState: {
        volume: 1,
        muted: false,
      },
      getSnapshot: ({ target }) => ({
        volume: target.volume,
        muted: target.muted,
      }),
      subscribe: ({ target, update, signal }) => {
        target.addEventListener(
          'volumechange',
          () => {
            update({ volume: target.volume });
          },
          { signal },
        );

        target.addEventListener(
          'mutechange',
          () => {
            update({ muted: target.muted });
          },
          { signal },
        );
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
      slices: [slice],
    });

    store.attach(new Target());

    store.subscribe(
      s => s.volume,
      (volume) => {
        volumeUpdates.push(volume);
      },
    );

    store.subscribe(
      s => s.muted,
      (muted) => {
        mutedUpdates.push(muted);
      },
    );

    await store.request.setVolume(0.5);
    await store.request.setMuted(true);
    await store.request.setVolume(0.8);

    expect(volumeUpdates).toEqual([0.5, 0.8]);
    expect(mutedUpdates).toEqual([true]);
  });

  it('multiple slices merge state correctly', () => {
    const audioSlice = createSlice<{ volume: number; rate: number }>()({
      initialState: { volume: 1 },
      getSnapshot: ({ target }) => ({ volume: target.volume }),
      subscribe: () => {},
      request: {},
    });

    const playbackSlice = createSlice<{ volume: number; rate: number }>()({
      initialState: { rate: 1 },
      getSnapshot: ({ target }) => ({ rate: target.rate }),
      subscribe: () => {},
      request: {},
    });

    const store = createStore({
      slices: [audioSlice, playbackSlice],
    });

    const target = { volume: 0.5, rate: 1.5 };
    store.attach(target);

    expect(store.state).toEqual({
      volume: 0.5,
      rate: 1.5,
    });
  });
});
