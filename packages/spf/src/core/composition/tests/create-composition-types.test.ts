import { describe, it } from 'vitest';
import { signal } from '../../signals/primitives';
import { type Behavior, type ContextSignals, createComposition, type StateSignals } from '../create-composition';

// =============================================================================
// Host-agnostic stand-in types
// -----------------------------------------------------------------------------
// Core is DOM-free. The tests need a small, concrete type to stand in for the
// kind of thing a user would pass as a context value — something with a
// writable surface and clear subtype relationships for compatibility tests.
// =============================================================================

interface Surface {
  textContent?: string | null;
}
interface VideoSurface extends Surface {
  kind: 'video';
}
interface CanvasSurface extends Surface {
  kind: 'canvas';
}

interface State {
  count?: number;
}

interface Context {
  el?: Surface;
}

const state: StateSignals<State> = { count: signal<number | undefined>(undefined) };
const context: ContextSignals<Context> = { el: signal<Surface | undefined>(undefined) };

// =============================================================================
// Per-signal type errors
// =============================================================================

describe('createComposition type errors', () => {
  // A typed behavior that pins the inferred composition shape so the error
  // tests below can target the expected shape without explicit type args.
  const noopState: Behavior<State, Context, object> = {
    stateKeys: [],
    contextKeys: [],
    setup: () => {},
  };

  it('errors when set() is called on a state signal with the wrong value type', () => {
    const composition = createComposition([noopState], { state, context });
    // @ts-expect-error — count is Signal<number | undefined>, not a string slot
    composition.state.count.set('not a number');
  });

  it('errors when get() is treated as the wrong type', () => {
    const composition = createComposition([noopState], { state, context });
    // @ts-expect-error — count.get() returns number | undefined, not string
    const _: string = composition.state.count.get();
    void _;
  });

  it('errors when state map is missing a required signal slot', () => {
    // @ts-expect-error — `state` map missing the `count` signal the inferred shape requires
    createComposition([noopState], { state: {}, context });
  });

  it('errors when context map is missing a required signal slot', () => {
    // @ts-expect-error — `context` map missing the `el` signal the inferred shape requires
    createComposition([noopState], { state, context: {} });
  });

  it('errors when state and context options are omitted entirely', () => {
    // Type-only assertion — guarded by an early return so the runtime
    // doesn't crash on the missing options.
    if (Math.random() < 0) {
      // @ts-expect-error — state and context are required options
      createComposition([noopState]);
    }
  });

  it('errors when a behavior writes a wrong-type value to a state signal', () => {
    const badBehavior: Behavior<State, Context, object> = {
      stateKeys: ['count'],
      contextKeys: [],
      setup: ({ state }) => {
        // @ts-expect-error — count is number | undefined
        state.count.set('wrong');
      },
    };
    void badBehavior;
  });

  it('errors when a behavior reads a state signal as the wrong type', () => {
    const badBehavior: Behavior<State, Context, object> = {
      stateKeys: ['count'],
      contextKeys: [],
      setup: ({ state }) => {
        // @ts-expect-error — count.get() returns number | undefined, not string
        const _: string = state.count.get();
        void _;
      },
    };
    void badBehavior;
  });

  it('errors when state or context maps have wrong-typed signal values', () => {
    // @ts-expect-error — count signal must hold number | undefined, not string
    const _bad: StateSignals<State> = { count: signal<string | undefined>(undefined) };
    void _bad;
  });

  // ==========================================================================
  // Composition-time conflict detection
  //
  // `ValidateComposition` resolves the parameter type to one of:
  //   'Error: behaviors have conflicting state types'
  //   'Error: behaviors have conflicting context types'
  //   'Error: behaviors have conflicting config types'
  //
  // when any pair of behaviors disagrees on a field type. The resolved
  // string then becomes the inferred parameter type, so passing the actual
  // behaviors array fails the assignability check.
  //
  // Context conflicts are checked the same way as state — by intersecting
  // each behavior's context requirement and looking for collapsed fields.
  // The prior subtype-based owner check is gone; a behavior pair where the
  // types are subtype-related (e.g. `Surface` and `VideoSurface`) is no
  // longer treated as compatible — both behaviors must agree on the same
  // type.
  // ==========================================================================

  it('errors when composing behaviors with conflicting required state types', () => {
    const expectsNumber = {
      stateKeys: ['value'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ value: number }> }) => {},
    };
    const expectsString = {
      stateKeys: ['value'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ value: string }> }) => {},
    };

    // @ts-expect-error — behaviors have incompatible state: { value: number } vs { value: string }
    createComposition([expectsNumber, expectsString], {
      state: { value: signal<number>(0) },
      context: {},
    });
  });

  it('errors when composing behaviors with conflicting optional state types', () => {
    const expectsNumber = {
      stateKeys: ['count'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ count?: number }> }) => {},
    };
    const expectsString = {
      stateKeys: ['count'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ count?: string }> }) => {},
    };

    // @ts-expect-error — behaviors have incompatible state: { count?: number } vs { count?: string }
    createComposition([expectsNumber, expectsString], {
      state: { count: signal<undefined>(undefined) },
      context: {},
    });
  });

  it('errors when composing behaviors with conflicting context types', () => {
    const expectsCanvas = {
      stateKeys: [],
      contextKeys: ['el'] as const,
      setup: (_deps: { context: ContextSignals<{ el?: CanvasSurface }> }) => {},
    };
    const expectsVideo = {
      stateKeys: [],
      contextKeys: ['el'] as const,
      setup: (_deps: { context: ContextSignals<{ el?: VideoSurface }> }) => {},
    };

    // @ts-expect-error — context conflict: CanvasSurface vs VideoSurface
    createComposition([expectsCanvas, expectsVideo], {
      state: {},
      context: { el: signal<undefined>(undefined) },
    });
  });

  it('allows context types in a subtype relationship to compose', () => {
    // Under the intersection-based rule, subtype-related types compose
    // without conflict — `Surface & VideoSurface = VideoSurface`. The prior
    // subtype-based owner check accepted this too; the difference vs. that
    // approach is sibling-type behavior (see the previous test).
    const expectsSurface = {
      stateKeys: [],
      contextKeys: ['el'] as const,
      setup: (_deps: { context: ContextSignals<{ el?: Surface }> }) => {},
    };
    const expectsVideo = {
      stateKeys: [],
      contextKeys: ['el'] as const,
      setup: (_deps: { context: ContextSignals<{ el?: VideoSurface }> }) => {},
    };

    // No error — Surface and VideoSurface intersect to VideoSurface.
    createComposition([expectsSurface, expectsVideo], {
      state: {},
      context: { el: signal<VideoSurface | undefined>(undefined) },
    });
  });

  it('errors when composing behaviors with conflicting config types', () => {
    const expectsNumber = {
      stateKeys: [],
      contextKeys: [],
      setup: (_deps: { config: { interval?: number } }) => {},
    };
    const expectsString = {
      stateKeys: [],
      contextKeys: [],
      setup: (_deps: { config: { interval?: string } }) => {},
    };

    // @ts-expect-error — config conflict: { interval?: number } vs { interval?: string }
    createComposition([expectsNumber, expectsString], {
      state: {},
      context: {},
      config: {},
    });
  });

  // ==========================================================================
  // Non-conflicts — disjoint or matching shapes compose freely
  // ==========================================================================

  it('allows composing behaviors that omit context', () => {
    const stateOnly = {
      stateKeys: ['count'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ count?: number }> }) => {},
    };
    const withContext = {
      stateKeys: ['count'] as const,
      contextKeys: ['el'] as const,
      setup: (_deps: { state: StateSignals<{ count?: number }>; context: ContextSignals<{ el?: Surface }> }) => {},
    };

    // No error — omitting context is not a conflict
    createComposition([stateOnly, withContext], {
      state: { count: signal<number | undefined>(undefined) },
      context: { el: signal<Surface | undefined>(undefined) },
    });
  });

  it('allows composing behaviors that omit state', () => {
    const configOnly = {
      stateKeys: [],
      contextKeys: [],
      setup: (_deps: { config: { interval?: number } }) => {},
    };
    const withState = {
      stateKeys: ['count'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ count?: number }>; config: { interval?: number } }) => {},
    };

    // No error — omitting state is not a conflict
    createComposition([configOnly, withState], {
      state: { count: signal<number | undefined>(undefined) },
      context: {},
      config: { interval: 250 },
    });
  });

  it('allows composing behaviors that omit config', () => {
    const stateOnly = {
      stateKeys: ['count'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ count?: number }> }) => {},
    };
    const withConfig = {
      stateKeys: ['count'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ count?: number }>; config: { interval?: number } }) => {},
    };

    // No error — omitting config is not a conflict
    createComposition([stateOnly, withConfig], {
      state: { count: signal<number | undefined>(undefined) },
      context: {},
      config: { interval: 250 },
    });
  });

  it('allows composing behaviors where each declares disjoint state keys', () => {
    const a = {
      stateKeys: ['count'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ count?: number }> }) => {},
    };
    const b = {
      stateKeys: ['label'] as const,
      contextKeys: [],
      setup: (_deps: { state: StateSignals<{ label?: string }> }) => {},
    };

    // No error — disjoint keys merge cleanly
    createComposition([a, b], {
      state: {
        count: signal<number | undefined>(undefined),
        label: signal<string | undefined>(undefined),
      },
      context: {},
    });
  });
});
