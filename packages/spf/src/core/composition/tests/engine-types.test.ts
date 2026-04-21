import { describe, expectTypeOf, it } from 'vitest';
import { effect } from '../../signals/effect';
import type { Signal } from '../../signals/primitives';
import { update } from '../../signals/primitives';
import {
  createComposition,
  type InferBehaviorConfig,
  type InferBehaviorOwners,
  type InferBehaviorState,
  type ResolveBehaviorOwners,
  type ResolveBehaviorState,
} from '../engine';

// =============================================================================
// Test behaviors — concrete parameter types
// =============================================================================

function counter({ state, config }: { state: Signal<{ count?: number }>; config: { interval?: number } }) {
  const interval = setInterval(() => {
    update(state, { count: (state.get().count ?? 0) + 1 });
  }, config.interval ?? 1000);
  return () => clearInterval(interval);
}

function render({
  state,
  owners,
  config,
}: {
  state: Signal<{ count?: number }>;
  owners: Signal<{ renderElement?: HTMLElement }>;
  config: { defaultText?: string };
}) {
  return effect(() => {
    const { renderElement } = owners.get();
    if (!renderElement) return;
    renderElement.textContent = String(state.get().count ?? config.defaultText ?? 'N/A');
  });
}

function persist({ state, config }: { state: Signal<{ count?: number }>; config: { saveEvery?: number } }) {
  return effect(() => {
    const { count } = state.get();
    if (count && count > 0 && count % (config.saveEvery ?? 5) === 0) {
      // save logic
    }
  });
}

// =============================================================================
// Test behaviors — generic parameter types (the pattern real behaviors use)
// =============================================================================

interface TimerState {
  elapsed?: number;
}

interface TimerConfig {
  tickRate?: number;
}

function timer<S extends TimerState, C extends TimerConfig>({ state, config }: { state: Signal<S>; config: C }) {
  const interval = setInterval(() => {
    update(state, { elapsed: (state.get().elapsed ?? 0) + 1 } as Partial<S>);
  }, config.tickRate ?? 1000);
  return () => clearInterval(interval);
}

// =============================================================================
// InferBehavior* — single behavior inference
// =============================================================================

describe('InferBehaviorState', () => {
  it('extracts state type from a concrete behavior', () => {
    expectTypeOf<InferBehaviorState<typeof counter>>().toEqualTypeOf<{ count?: number }>();
  });

  it('extracts state type from a behavior that uses owners', () => {
    expectTypeOf<InferBehaviorState<typeof render>>().toEqualTypeOf<{ count?: number }>();
  });

  it('returns object for a behavior with no state in params', () => {
    const noState = ({ config: _config }: { config: { x: number } }) => {};
    expectTypeOf<InferBehaviorState<typeof noState>>().toEqualTypeOf<object>();
  });
});

describe('InferBehaviorOwners', () => {
  it('extracts owners type from a behavior that uses owners', () => {
    expectTypeOf<InferBehaviorOwners<typeof render>>().toEqualTypeOf<{ renderElement?: HTMLElement }>();
  });

  it('returns object for a behavior with no owners in params', () => {
    expectTypeOf<InferBehaviorOwners<typeof counter>>().toEqualTypeOf<object>();
  });
});

describe('InferBehaviorConfig', () => {
  it('extracts config type from a concrete behavior', () => {
    expectTypeOf<InferBehaviorConfig<typeof counter>>().toEqualTypeOf<{ interval?: number }>();
  });

  it('extracts different config types from different behaviors', () => {
    expectTypeOf<InferBehaviorConfig<typeof render>>().toEqualTypeOf<{ defaultText?: string }>();
    expectTypeOf<InferBehaviorConfig<typeof persist>>().toEqualTypeOf<{ saveEvery?: number }>();
  });
});

describe('InferBehavior* with generic behaviors', () => {
  it('infers constraint types from generic behaviors', () => {
    expectTypeOf<InferBehaviorState<typeof timer>>().toEqualTypeOf<TimerState>();
    expectTypeOf<InferBehaviorConfig<typeof timer>>().toEqualTypeOf<TimerConfig>();
  });
});

// =============================================================================
// ResolveBehavior* — multi-behavior composition inference
// =============================================================================

describe('ResolveBehaviorState', () => {
  it('intersects state from multiple behaviors', () => {
    type Behaviors = [typeof counter, typeof render, typeof persist];
    // All three expect { count?: number }, intersection is the same
    expectTypeOf<ResolveBehaviorState<Behaviors>>().toEqualTypeOf<{ count?: number }>();
  });

  it('intersects different state shapes', () => {
    const behaviorA = (_deps: { state: Signal<{ count?: number }> }) => {};
    const behaviorB = (_deps: { state: Signal<{ label?: string }> }) => {};
    const engine = createComposition([behaviorA, behaviorB]);
    expectTypeOf(engine.state.get()).toExtend<{ count?: number; label?: string }>();
  });
});

describe('ResolveBehaviorOwners', () => {
  it('resolves owners from mixed behaviors (some without owners)', () => {
    // counter has no owners, render has renderElement
    type Behaviors = [typeof counter, typeof render];
    // object & { renderElement?: HTMLElement } should simplify
    expectTypeOf<ResolveBehaviorOwners<Behaviors>>().toExtend<{ renderElement?: HTMLElement }>();
  });
});

describe('ResolveBehaviorConfig', () => {
  it('intersects config from multiple behaviors', () => {
    const engine = createComposition([counter, render, persist], {
      config: { interval: 250, defaultText: '--', saveEvery: 5 },
    });
    expectTypeOf(engine.state.get()).toExtend<{ count?: number }>();
  });
});

// =============================================================================
// createComposition — inference at the call site
// =============================================================================

describe('createComposition', () => {
  describe('single behavior', () => {
    it('infers state type from a single behavior', () => {
      const engine = createComposition([counter], {
        config: { interval: 250 },
      });
      expectTypeOf(engine.state.get()).toEqualTypeOf<{ count?: number }>();
    });

    it('infers types from an inline arrow behavior', () => {
      const engine = createComposition([
        ({ state }: { state: Signal<{ value?: string }> }) => {
          update(state, { value: 'hello' });
        },
      ]);
      expectTypeOf(engine.state.get()).toEqualTypeOf<{ value?: string }>();
    });
  });

  describe('behavior array', () => {
    it('infers combined state from multiple behaviors', () => {
      const engine = createComposition([counter, render, persist], {
        initialState: { count: 0 },
        config: { interval: 250, defaultText: '--', saveEvery: 5 },
        initialOwners: { renderElement: null as unknown as HTMLElement },
      });

      expectTypeOf(engine.state.get()).toExtend<{ count?: number }>();
      expectTypeOf(engine.owners.get()).toExtend<{ renderElement?: HTMLElement }>();
    });

    it('infers combined state from behaviors with different state shapes', () => {
      const behaviorA = (_deps: { state: Signal<{ count?: number }> }) => {};
      const behaviorB = (_deps: { state: Signal<{ label?: string }> }) => {};

      const engine = createComposition([behaviorA, behaviorB]);
      expectTypeOf(engine.state.get()).toExtend<{ count?: number; label?: string }>();
    });

    it('type-checks options against inferred types', () => {
      // Config must satisfy the combined config requirements
      const engine = createComposition([counter, render], {
        config: { interval: 250, defaultText: '--' },
      });

      expectTypeOf(engine.state.get()).toExtend<{ count?: number }>();
    });
  });

  describe('generic behaviors', () => {
    it('infers constraint types from generic behaviors', () => {
      const engine = createComposition([timer], {
        config: { tickRate: 500 },
      });

      expectTypeOf(engine.state.get()).toExtend<{ elapsed?: number }>();
    });
  });

  describe('resetting optional fields to undefined', () => {
    it('allows update() with undefined for optional state fields', () => {
      const engine = createComposition([counter]);

      // Behaviors declare { count?: number } — resetting to undefined is valid
      // without the behavior needing to declare | undefined explicitly.
      update(engine.state, { count: undefined });
      expectTypeOf(engine.state.get().count).toEqualTypeOf<number | undefined>();
    });

    it('allows update() with undefined for optional owners fields', () => {
      const engine = createComposition([render], {
        initialOwners: { renderElement: null as unknown as HTMLElement },
      });

      // Clearing an owner (e.g. on source switch)
      update(engine.owners, { renderElement: undefined });
      expectTypeOf(engine.owners.get().renderElement).toEqualTypeOf<HTMLElement | undefined>();
    });
  });

  // Type error enforcement tests (@ts-expect-error for wrong types, conflicting
  // behaviors, etc.) live in engine-types.test-d.ts and run via vitest typecheck.
});
