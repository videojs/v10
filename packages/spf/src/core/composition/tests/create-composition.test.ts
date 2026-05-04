import { describe, expect, it } from 'vitest';
import { signal } from '../../signals/primitives';
import {
  type Behavior,
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

function makeState(initial: State = {}): StateSignals<State> {
  return { count: signal<number | undefined>(initial.count) };
}

function makeContext(initial: Context = {}): ContextSignals<Context> {
  return { resource: signal<Resource | undefined>(initial.resource) };
}

describe('createComposition', () => {
  describe('destroy()', () => {
    it('clears context signals populated by a behavior during setup', async () => {
      const setBehavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: ['resource'],
        setup: ({ context }) => {
          context.resource.set({ id: 'r1' });
        },
      };

      const composition = createComposition([setBehavior], {
        state: makeState(),
        context: makeContext(),
      });

      expect(composition.context.resource.get()).toEqual({ id: 'r1' });

      await composition.destroy();

      expect(composition.context.resource.get()).toBeUndefined();
    });

    it('clears context signals populated via the initial signal map', async () => {
      const resource: Resource = { id: 'r1' };
      const noopBehavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: [],
        setup: () => {},
      };

      const composition = createComposition([noopBehavior], {
        state: makeState(),
        context: makeContext({ resource }),
      });

      expect(composition.context.resource.get()).toBe(resource);

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
        state: makeState(),
        context: makeContext({ resource }),
      });

      await composition.destroy();

      expect(resourceSeenByCleanup).toEqual(resource);
      expect(composition.context.resource.get()).toBeUndefined();
    });

    it('awaits async cleanups before clearing context', async () => {
      let cleanupCompleted = false;

      const asyncCleanupBehavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: [],
        setup: () => async () => {
          await new Promise<void>((resolve) => setTimeout(resolve, 10));
          cleanupCompleted = true;
        },
      };

      const composition = createComposition([asyncCleanupBehavior], {
        state: makeState(),
        context: makeContext({ resource: { id: 'r1' } }),
      });

      const destroyPromise = composition.destroy();
      expect(cleanupCompleted).toBe(false);

      await destroyPromise;

      expect(cleanupCompleted).toBe(true);
      expect(composition.context.resource.get()).toBeUndefined();
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

      const context: ContextSignals<MultiContext> = {
        a: signal<Resource | undefined>(undefined),
        b: signal<Resource | undefined>(undefined),
      };
      const composition = createComposition([setA, setB], { state: makeState(), context });

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

      const composition = createComposition([incrementCount], {
        state: makeState(),
        context: makeContext(),
      });

      expect(composition.state.count.get()).toBe(5);

      await composition.destroy();

      expect(composition.state.count.get()).toBeUndefined();
    });
  });

  describe('behavior wiring', () => {
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

      createComposition([captureA, captureB], {
        state: makeState(),
        context: makeContext(),
      });

      expect(stateA).toBeDefined();
      expect(stateA).toBe(stateB);
    });

    it('exposes the same signal maps via composition.state and composition.context', () => {
      const state = makeState();
      const context = makeContext();
      const noopBehavior: Behavior<State, Context, object> = {
        stateKeys: [],
        contextKeys: [],
        setup: () => {},
      };
      const composition = createComposition([noopBehavior], { state, context });

      expect(composition.state).toBe(state);
      expect(composition.context).toBe(context);
    });

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

      createComposition([captureConfig], {
        state: makeState(),
        context: makeContext(),
        config,
      });

      expect(received).toBe(config);
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

    const composition = createComposition([incrementCount], {
      state: makeState(),
      context: makeContext(),
    });

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

    const composition = createComposition([withCleanup], {
      state: makeState(),
      context: makeContext(),
    });

    expect(cleanupRan).toBe(false);
    await composition.destroy();
    expect(cleanupRan).toBe(true);
  });
});
