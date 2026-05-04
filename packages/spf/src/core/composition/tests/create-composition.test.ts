import { describe, expect, it } from 'vitest';
import {
  type Behavior,
  buildSignalMap,
  type ContextSignals,
  createComposition,
  defineBehavior,
  type StateSignals,
} from '../create-composition';

interface Resource {
  id: string;
}

interface State {
  count?: number;
}

interface Context {
  resource?: Resource;
}

describe('createComposition', () => {
  describe('signal map derivation', () => {
    it('creates one signal per declared state key', () => {
      const behavior: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: () => {},
      };
      const composition = createComposition([behavior]);

      expect(typeof composition.state.count.get).toBe('function');
      expect(composition.state.count.get()).toBeUndefined();
    });

    it('creates one signal per declared context key', () => {
      const behavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: ['resource'],
        setup: () => {},
      };
      const composition = createComposition([behavior]);

      expect(typeof composition.context.resource.get).toBe('function');
      expect(composition.context.resource.get()).toBeUndefined();
    });

    it('deduplicates keys across behaviors that share them', () => {
      const a: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: ({ state }) => {
          state.count.set(1);
        },
      };
      const b: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: ({ state }) => {
          // Both behaviors see the same signal — b reads what a wrote.
          expect(state.count.get()).toBe(1);
          state.count.set((state.count.get() ?? 0) + 1);
        },
      };
      const composition = createComposition([a, b]);

      expect(composition.state.count.get()).toBe(2);
    });

    it('passes the same signal map references to every behavior', () => {
      let stateA: StateSignals<State> | undefined;
      let stateB: StateSignals<State> | undefined;

      const captureA: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: ({ state }) => {
          stateA = state;
        },
      };
      const captureB: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: ({ state }) => {
          stateB = state;
        },
      };

      createComposition([captureA, captureB]);

      expect(stateA).toBeDefined();
      expect(stateA).toBe(stateB);
    });
  });

  describe('destroy()', () => {
    it('clears context signals populated by a behavior during setup', async () => {
      const setBehavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: ['resource'],
        setup: ({ context }) => {
          context.resource.set({ id: 'r1' });
        },
      };

      const composition = createComposition([setBehavior]);

      expect(composition.context.resource.get()).toEqual({ id: 'r1' });

      await composition.destroy();

      expect(composition.context.resource.get()).toBeUndefined();
    });

    it('runs behavior cleanups with context still populated, then clears', async () => {
      const resource: Resource = { id: 'r1' };
      let resourceSeenByCleanup: Resource | undefined;

      const cleanupBehavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: ['resource'],
        setup: ({ context }) => {
          return () => {
            resourceSeenByCleanup = context.resource.get();
          };
        },
      };

      const composition = createComposition([cleanupBehavior], {
        initialContext: { resource },
      });

      await composition.destroy();

      expect(resourceSeenByCleanup).toEqual(resource);
      expect(composition.context.resource.get()).toBeUndefined();
    });

    it('awaits async cleanups before clearing', async () => {
      let cleanupCompleted = false;

      const asyncCleanupBehavior: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup:
          ({ state }) =>
          async () => {
            await new Promise<void>((resolve) => setTimeout(resolve, 10));
            cleanupCompleted = true;
            // Verify state is still readable inside the cleanup.
            void state.count.get();
          },
      };

      const composition = createComposition([asyncCleanupBehavior]);

      const destroyPromise = composition.destroy();
      expect(cleanupCompleted).toBe(false);

      await destroyPromise;

      expect(cleanupCompleted).toBe(true);
      expect(composition.state.count.get()).toBeUndefined();
    });

    it('clears across multiple keys from multiple behaviors', async () => {
      interface MultiContext {
        a?: Resource;
        b?: Resource;
      }
      const setA: Behavior<State, MultiContext, object> = {
        stateKeys: [],
        contextKeys: ['a'],
        setup: ({ context }) => {
          context.a.set({ id: 'a1' });
        },
      };
      const setB: Behavior<State, MultiContext, object> = {
        stateKeys: [],
        contextKeys: ['b'],
        setup: ({ context }) => {
          context.b.set({ id: 'b1' });
        },
      };

      const composition = createComposition([setA, setB]);

      expect(composition.context.a.get()).toEqual({ id: 'a1' });
      expect(composition.context.b.get()).toEqual({ id: 'b1' });

      await composition.destroy();

      expect(composition.context.a.get()).toBeUndefined();
      expect(composition.context.b.get()).toBeUndefined();
    });

    it('also clears state signals on destroy', async () => {
      const incrementCount: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: ({ state }) => {
          state.count.set(5);
        },
      };

      const composition = createComposition([incrementCount]);

      expect(composition.state.count.get()).toBe(5);

      await composition.destroy();

      expect(composition.state.count.get()).toBeUndefined();
    });
  });

  describe('initial values', () => {
    it('seeds state signals from initialState', () => {
      const behavior: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: () => {},
      };
      const composition = createComposition([behavior], {
        initialState: { count: 42 },
      });

      expect(composition.state.count.get()).toBe(42);
    });

    it('seeds context signals from initialContext', () => {
      const resource: Resource = { id: 'seeded' };
      const behavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: ['resource'],
        setup: () => {},
      };
      const composition = createComposition([behavior], {
        initialContext: { resource },
      });

      expect(composition.context.resource.get()).toBe(resource);
    });

    it('leaves unseeded keys as undefined', () => {
      interface MultiState {
        a?: number;
        b?: number;
      }
      const behavior: Behavior<MultiState, Context, object> = {
        stateKeys: ['a', 'b'],
        contextKeys: [],
        setup: () => {},
      };
      const composition = createComposition([behavior], {
        initialState: { a: 1 },
      });

      expect(composition.state.a.get()).toBe(1);
      expect(composition.state.b.get()).toBeUndefined();
    });

    it('makes seeded values visible to behaviors during setup', () => {
      let seen: number | undefined;
      const captureBehavior: Behavior<State, Context, object> = {
        stateKeys: ['count'],
        contextKeys: [],
        setup: ({ state }) => {
          seen = state.count.get();
        },
      };

      createComposition([captureBehavior], { initialState: { count: 7 } });

      expect(seen).toBe(7);
    });
  });

  describe('config', () => {
    it('passes config to behaviors verbatim', () => {
      let received: { interval: number } | undefined;
      const config = { interval: 250 };

      const captureConfig: Behavior<State, Context, { interval: number }> = {
        stateKeys: [],
        contextKeys: [],
        setup: ({ config }) => {
          received = config;
        },
      };

      createComposition([captureConfig], { config });

      expect(received).toBe(config);
    });

    it('defaults config to empty object when not supplied', () => {
      let received: object | undefined;

      const captureConfig: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: [],
        setup: ({ config }) => {
          received = config;
        },
      };

      createComposition([captureConfig]);

      expect(received).toEqual({});
    });
  });
});

describe('defineBehavior', () => {
  it('preserves stateKeys, contextKeys, and setup on the returned object', () => {
    const setup = (): void => {};
    const behavior = defineBehavior({
      stateKeys: ['a'],
      contextKeys: ['b'],
      setup: setup as (deps: { state: StateSignals<{ a?: number }>; context: ContextSignals<{ b?: string }> }) => void,
    });
    expect(behavior.stateKeys).toEqual(['a']);
    expect(behavior.contextKeys).toEqual(['b']);
    expect(behavior.setup).toBe(setup);
  });

  it('is essentially identity at runtime — returns the same input properties', () => {
    const stateKeys = ['count'] as const;
    const contextKeys = [] as const;
    const setup = ({ state }: { state: StateSignals<{ count?: number }> }) => {
      void state;
    };
    const input = { stateKeys, contextKeys, setup };
    const result = defineBehavior(input);

    expect(result.stateKeys).toBe(stateKeys);
    expect(result.contextKeys).toBe(contextKeys);
    expect(result.setup).toBe(setup);
  });

  it('produces a behavior that composes correctly with createComposition', () => {
    const incrementCount = defineBehavior({
      stateKeys: ['count'],
      contextKeys: [],
      setup: ({ state }: { state: StateSignals<{ count?: number }> }) => {
        state.count.set(7);
      },
    });

    const composition = createComposition([incrementCount]);

    expect(composition.state.count.get()).toBe(7);
  });

  it('produces a behavior whose returned cleanup runs on destroy', async () => {
    let cleanupRan = false;
    const withCleanup = defineBehavior({
      stateKeys: [],
      contextKeys: [],
      setup: () => () => {
        cleanupRan = true;
      },
    });

    const composition = createComposition([withCleanup]);

    expect(cleanupRan).toBe(false);
    await composition.destroy();
    expect(cleanupRan).toBe(true);
  });
});

describe('buildSignalMap', () => {
  it('creates one signal per key', () => {
    const map = buildSignalMap<{ a?: number; b?: string }>(['a', 'b'], {});
    expect(typeof map.a.get).toBe('function');
    expect(typeof map.b.get).toBe('function');
    expect(map.a.get()).toBeUndefined();
    expect(map.b.get()).toBeUndefined();
  });

  it('seeds signals from initial values', () => {
    const map = buildSignalMap<{ count?: number; label?: string }>(['count', 'label'], {
      count: 42,
      label: 'hello',
    });
    expect(map.count.get()).toBe(42);
    expect(map.label.get()).toBe('hello');
  });

  it('leaves unseeded keys as undefined', () => {
    const map = buildSignalMap<{ a?: number; b?: string }>(['a', 'b'], { a: 1 });
    expect(map.a.get()).toBe(1);
    expect(map.b.get()).toBeUndefined();
  });

  it('deduplicates duplicate keys (one signal per unique key)', () => {
    const map = buildSignalMap<{ a?: number; b?: string }>(['a', 'b', 'a', 'b', 'a'], {});
    expect(Object.keys(map)).toEqual(['a', 'b']);
  });

  it('returns reactive signals — set/get works', () => {
    const map = buildSignalMap<{ count?: number }>(['count'], { count: 0 });
    expect(map.count.get()).toBe(0);
    map.count.set(7);
    expect(map.count.get()).toBe(7);
  });

  it('produces an empty map for an empty key list', () => {
    // biome-ignore lint/complexity/noBannedTypes: empty interface intentional
    const map = buildSignalMap<{}>([], {});
    expect(Object.keys(map)).toEqual([]);
  });

  it('accepts any Iterable<PropertyKey> — Set, generator, etc.', () => {
    const fromSet = buildSignalMap<{ a?: number; b?: string }>(new Set(['a', 'b']), {});
    expect(Object.keys(fromSet).sort()).toEqual(['a', 'b']);

    function* keys(): Generator<PropertyKey> {
      yield 'a';
      yield 'b';
    }
    const fromGen = buildSignalMap<{ a?: number; b?: string }>(keys(), {});
    expect(Object.keys(fromGen).sort()).toEqual(['a', 'b']);
  });

  it('preserves first-occurrence order across duplicate keys', () => {
    const map = buildSignalMap<{ a?: number; b?: string; c?: boolean }>(['c', 'a', 'b', 'a', 'c'], {});
    // Set keeps insertion order; first occurrence of each key wins.
    expect(Object.keys(map)).toEqual(['c', 'a', 'b']);
  });
});
