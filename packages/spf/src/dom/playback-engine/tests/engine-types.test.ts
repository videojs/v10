import { describe, expectTypeOf, it } from 'vitest';
import { effect } from '../../../core/signals/effect';
import type { Signal } from '../../../core/signals/primitives';
import { update } from '../../../core/signals/primitives';
import {
  createPlaybackEngine,
  type InferFeatureConfig,
  type InferFeatureOwners,
  type InferFeatureState,
  type ResolveFeatureOwners,
  type ResolveFeatureState,
} from '../engine';

// =============================================================================
// Test features — concrete parameter types
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
// Test features — generic parameter types (the pattern real features use)
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
// InferFeature* — single feature inference
// =============================================================================

describe('InferFeatureState', () => {
  it('extracts state type from a concrete feature', () => {
    expectTypeOf<InferFeatureState<typeof counter>>().toEqualTypeOf<{ count?: number }>();
  });

  it('extracts state type from a feature that uses owners', () => {
    expectTypeOf<InferFeatureState<typeof render>>().toEqualTypeOf<{ count?: number }>();
  });

  it('returns object for a feature with no state in params', () => {
    const noState = ({ config: _config }: { config: { x: number } }) => {};
    expectTypeOf<InferFeatureState<typeof noState>>().toEqualTypeOf<object>();
  });
});

describe('InferFeatureOwners', () => {
  it('extracts owners type from a feature that uses owners', () => {
    expectTypeOf<InferFeatureOwners<typeof render>>().toEqualTypeOf<{ renderElement?: HTMLElement }>();
  });

  it('returns object for a feature with no owners in params', () => {
    expectTypeOf<InferFeatureOwners<typeof counter>>().toEqualTypeOf<object>();
  });
});

describe('InferFeatureConfig', () => {
  it('extracts config type from a concrete feature', () => {
    expectTypeOf<InferFeatureConfig<typeof counter>>().toEqualTypeOf<{ interval?: number }>();
  });

  it('extracts different config types from different features', () => {
    expectTypeOf<InferFeatureConfig<typeof render>>().toEqualTypeOf<{ defaultText?: string }>();
    expectTypeOf<InferFeatureConfig<typeof persist>>().toEqualTypeOf<{ saveEvery?: number }>();
  });
});

describe('InferFeature* with generic features', () => {
  it('infers constraint types from generic features', () => {
    expectTypeOf<InferFeatureState<typeof timer>>().toEqualTypeOf<TimerState>();
    expectTypeOf<InferFeatureConfig<typeof timer>>().toEqualTypeOf<TimerConfig>();
  });
});

// =============================================================================
// ResolveFeature* — multi-feature composition inference
// =============================================================================

describe('ResolveFeatureState', () => {
  it('intersects state from multiple features', () => {
    type Features = [typeof counter, typeof render, typeof persist];
    // All three expect { count?: number }, intersection is the same
    expectTypeOf<ResolveFeatureState<Features>>().toEqualTypeOf<{ count?: number }>();
  });

  it('intersects different state shapes', () => {
    const featureA = (_deps: { state: Signal<{ count?: number }> }) => {};
    const featureB = (_deps: { state: Signal<{ label?: string }> }) => {};
    const engine = createPlaybackEngine([featureA, featureB]);
    expectTypeOf(engine.state.get()).toExtend<{ count?: number; label?: string }>();
  });
});

describe('ResolveFeatureOwners', () => {
  it('resolves owners from mixed features (some without owners)', () => {
    // counter has no owners, render has renderElement
    type Features = [typeof counter, typeof render];
    // object & { renderElement?: HTMLElement } should simplify
    expectTypeOf<ResolveFeatureOwners<Features>>().toExtend<{ renderElement?: HTMLElement }>();
  });
});

describe('ResolveFeatureConfig', () => {
  it('intersects config from multiple features', () => {
    const engine = createPlaybackEngine([counter, render, persist], {
      config: { interval: 250, defaultText: '--', saveEvery: 5 },
    });
    expectTypeOf(engine.state.get()).toExtend<{ count?: number }>();
  });
});

// =============================================================================
// createPlaybackEngine — inference at the call site
// =============================================================================

describe('createPlaybackEngine', () => {
  describe('single feature', () => {
    it('infers state type from a single feature', () => {
      const engine = createPlaybackEngine(counter, {
        config: { interval: 250 },
      });
      expectTypeOf(engine.state.get()).toEqualTypeOf<{ count?: number }>();
    });

    it('infers types from an inline arrow feature', () => {
      const engine = createPlaybackEngine(({ state }: { state: Signal<{ value?: string }> }) => {
        update(state, { value: 'hello' });
      });
      expectTypeOf(engine.state.get()).toEqualTypeOf<{ value?: string }>();
    });
  });

  describe('feature array', () => {
    it('infers combined state from multiple features', () => {
      const engine = createPlaybackEngine([counter, render, persist], {
        initialState: { count: 0 },
        config: { interval: 250, defaultText: '--', saveEvery: 5 },
        initialOwners: { renderElement: document.createElement('div') },
      });

      expectTypeOf(engine.state.get()).toExtend<{ count?: number }>();
      expectTypeOf(engine.owners.get()).toExtend<{ renderElement?: HTMLElement }>();
    });

    it('infers combined state from features with different state shapes', () => {
      const featureA = (_deps: { state: Signal<{ count?: number }> }) => {};
      const featureB = (_deps: { state: Signal<{ label?: string }> }) => {};

      const engine = createPlaybackEngine([featureA, featureB]);
      expectTypeOf(engine.state.get()).toExtend<{ count?: number; label?: string }>();
    });

    it('type-checks options against inferred types', () => {
      // Config must satisfy the combined config requirements
      const engine = createPlaybackEngine([counter, render], {
        config: { interval: 250, defaultText: '--' },
      });

      expectTypeOf(engine.state.get()).toExtend<{ count?: number }>();
    });
  });

  describe('generic features', () => {
    it('infers constraint types from generic features', () => {
      const engine = createPlaybackEngine([timer], {
        config: { tickRate: 500 },
      });

      expectTypeOf(engine.state.get()).toExtend<{ elapsed?: number }>();
    });
  });

  describe('type errors', () => {
    it('resolves conflicting feature state types to never', () => {
      const expectsNumber = (_deps: { state: Signal<{ value: number }> }) => {};
      const expectsString = (_deps: { state: Signal<{ value: string }> }) => {};

      const engine = createPlaybackEngine([expectsNumber, expectsString]);

      // The intersection of { value: number } & { value: string } is { value: never }.
      expectTypeOf(engine.state.get().value).toEqualTypeOf<never>();
    });

    // Additional @ts-expect-error tests (wrong types for update, set, options)
    // live in engine-types.test-d.ts and run via vitest typecheck.
  });
});
