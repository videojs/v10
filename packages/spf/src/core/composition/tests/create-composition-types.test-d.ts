import { describe, expectTypeOf, it } from 'vitest';
import { type Signal, signal } from '../../signals/primitives';
import {
  type Behavior,
  type BehaviorDeps,
  type Composition,
  type ContextSignals,
  createComposition,
  type InferBehaviorConfig,
  type InferBehaviorContext,
  type InferBehaviorState,
  type ResolveBehaviorConfig,
  type ResolveBehaviorContext,
  type ResolveBehaviorState,
  type StateSignals,
} from '../create-composition';

// =============================================================================
// Stand-in types
// =============================================================================

interface Surface {
  textContent?: string | null;
}

// =============================================================================
// Test behaviors — concrete parameter types
// =============================================================================

const counter = {
  stateKeys: ['count'] as const,
  contextKeys: [],
  setup({ state, config }: { state: StateSignals<{ count?: number }>; config: { interval?: number } }) {
    state.count.set((state.count.get() ?? 0) + 1);
    void config;
  },
};

const render = {
  stateKeys: ['count'] as const,
  contextKeys: ['renderElement'] as const,
  setup({
    state,
    context,
    config,
  }: {
    state: StateSignals<{ count?: number }>;
    context: ContextSignals<{ renderElement?: Surface }>;
    config: { defaultText?: string };
  }) {
    const el = context.renderElement.get();
    if (!el) return;
    el.textContent = String(state.count.get() ?? config.defaultText ?? 'N/A');
  },
};

const persist = {
  stateKeys: ['count'] as const,
  contextKeys: [],
  setup({ state, config }: { state: StateSignals<{ count?: number }>; config: { saveEvery?: number } }) {
    const c = state.count.get();
    if (c && c > 0 && c % (config.saveEvery ?? 5) === 0) {
      // save logic
    }
  },
};

// =============================================================================
// StateSignals / ContextSignals shape
// =============================================================================

describe('StateSignals', () => {
  it('produces one signal per state field', () => {
    type Map = StateSignals<{ count?: number; label?: string }>;
    expectTypeOf<Map['count']>().toEqualTypeOf<Signal<number | undefined>>();
    expectTypeOf<Map['label']>().toEqualTypeOf<Signal<string | undefined>>();
  });

  it('strips optionality on signal slots while preserving undefined in value type', () => {
    type Map = StateSignals<{ count?: number }>;
    expectTypeOf<Map>().toEqualTypeOf<{ count: Signal<number | undefined> }>();
  });

  it('preserves required fields without injecting undefined', () => {
    type Map = StateSignals<{ count: number }>;
    expectTypeOf<Map>().toEqualTypeOf<{ count: Signal<number> }>();
  });
});

describe('ContextSignals', () => {
  it('produces one signal per context field', () => {
    type Map = ContextSignals<{ el?: Surface; flag?: boolean }>;
    expectTypeOf<Map['el']>().toEqualTypeOf<Signal<Surface | undefined>>();
    expectTypeOf<Map['flag']>().toEqualTypeOf<Signal<boolean | undefined>>();
  });
});

describe('Composition<S, C>', () => {
  it('exposes state and context as signal maps plus an async destroy', () => {
    interface State {
      count?: number;
    }
    interface Context {
      el?: Surface;
    }
    type Comp = Composition<State, Context>;
    expectTypeOf<Comp['state']>().toEqualTypeOf<StateSignals<State>>();
    expectTypeOf<Comp['context']>().toEqualTypeOf<ContextSignals<Context>>();
    expectTypeOf<Comp['destroy']>().toEqualTypeOf<() => Promise<void>>();
  });
});

describe('BehaviorDeps<S, C, Cfg>', () => {
  it('exposes state, context, and config to behaviors', () => {
    interface State {
      count?: number;
    }
    interface Context {
      el?: Surface;
    }
    interface Cfg {
      interval?: number;
    }
    type Deps = BehaviorDeps<State, Context, Cfg>;
    expectTypeOf<Deps['state']>().toEqualTypeOf<StateSignals<State>>();
    expectTypeOf<Deps['context']>().toEqualTypeOf<ContextSignals<Context>>();
    expectTypeOf<Deps['config']>().toEqualTypeOf<Cfg>();
  });
});

// =============================================================================
// InferBehavior* — single behavior inference
// =============================================================================

describe('InferBehaviorState', () => {
  it('extracts state shape from a behavior that uses signal-map deps', () => {
    expectTypeOf<InferBehaviorState<typeof counter>>().toEqualTypeOf<{ count: number | undefined }>();
  });

  it('extracts state shape from a behavior that also uses context', () => {
    expectTypeOf<InferBehaviorState<typeof render>>().toEqualTypeOf<{ count: number | undefined }>();
  });

  it('returns an empty shape for a behavior with no state in params', () => {
    const noState = {
      stateKeys: [],
      contextKeys: [],
      setup: ({ config: _config }: { config: { x: number } }) => {},
    };
    // biome-ignore lint/complexity/noBannedTypes: matches the Empty fallback in create-composition
    expectTypeOf<InferBehaviorState<typeof noState>>().toEqualTypeOf<{}>();
  });
});

describe('InferBehaviorContext', () => {
  it('extracts context shape from a behavior that uses context', () => {
    expectTypeOf<InferBehaviorContext<typeof render>>().toEqualTypeOf<{ renderElement: Surface | undefined }>();
  });

  it('returns an empty shape for a behavior with no context in params', () => {
    // biome-ignore lint/complexity/noBannedTypes: matches the Empty fallback in create-composition
    expectTypeOf<InferBehaviorContext<typeof counter>>().toEqualTypeOf<{}>();
  });
});

describe('InferBehaviorConfig', () => {
  it('extracts config type from a behavior', () => {
    expectTypeOf<InferBehaviorConfig<typeof counter>>().toEqualTypeOf<{ interval?: number }>();
  });

  it('extracts different config types from different behaviors', () => {
    expectTypeOf<InferBehaviorConfig<typeof render>>().toEqualTypeOf<{ defaultText?: string }>();
    expectTypeOf<InferBehaviorConfig<typeof persist>>().toEqualTypeOf<{ saveEvery?: number }>();
  });
});

// =============================================================================
// ResolveBehavior* — multi-behavior composition inference
// =============================================================================

describe('ResolveBehaviorState', () => {
  it('intersects state from multiple behaviors with matching shapes', () => {
    type Behaviors = [typeof counter, typeof render, typeof persist];
    expectTypeOf<ResolveBehaviorState<Behaviors>>().toEqualTypeOf<{ count: number | undefined }>();
  });

  it('intersects different state shapes', () => {
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
    type Behaviors = [typeof a, typeof b];
    expectTypeOf<ResolveBehaviorState<Behaviors>>().toMatchTypeOf<{
      count: number | undefined;
      label: string | undefined;
    }>();
  });
});

describe('ResolveBehaviorContext', () => {
  it('resolves context from mixed behaviors (some without context)', () => {
    type Behaviors = [typeof counter, typeof render];
    expectTypeOf<ResolveBehaviorContext<Behaviors>>().toMatchTypeOf<{ renderElement: Surface | undefined }>();
  });

  it('probe: resolves conflicting context types to undefined-collapsed shape', () => {
    interface Surf {
      kind: 'canvas' | 'video';
    }
    interface CanvasS extends Surf {
      kind: 'canvas';
    }
    interface VideoS extends Surf {
      kind: 'video';
    }
    const a = {
      stateKeys: [],
      contextKeys: ['el'] as const,
      setup: (_d: { context: ContextSignals<{ el?: CanvasS }> }) => {},
    };
    const b = {
      stateKeys: [],
      contextKeys: ['el'] as const,
      setup: (_d: { context: ContextSignals<{ el?: VideoS }> }) => {},
    };
    type Resolved = ResolveBehaviorContext<[typeof a, typeof b]>;
    // The intersection should collapse `el` because CanvasS & VideoS = never
    // (sibling types), and `never | undefined` = `undefined` for an optional field.
    expectTypeOf<Resolved['el']>().toEqualTypeOf<undefined>();
  });
});

describe('ResolveBehaviorConfig', () => {
  it('intersects config from multiple behaviors', () => {
    type Behaviors = [typeof counter, typeof render, typeof persist];
    expectTypeOf<ResolveBehaviorConfig<Behaviors>>().toMatchTypeOf<{
      interval?: number;
      defaultText?: string;
      saveEvery?: number;
    }>();
  });
});

// =============================================================================
// createComposition signatures
// =============================================================================

describe('createComposition', () => {
  it('returns a Composition typed by the resolved behaviors', () => {
    interface State {
      count?: number;
    }
    interface Context {
      el?: Surface;
    }
    interface Cfg {
      interval?: number;
    }

    const behavior: Behavior<State, Context, Cfg> = {
      stateKeys: [],
      contextKeys: [],
      setup: () => {},
    };

    const state: StateSignals<State> = { count: signal<number | undefined>(undefined) };
    const context: ContextSignals<Context> = { el: signal<Surface | undefined>(undefined) };
    const composition = createComposition([behavior], {
      state,
      context,
      config: { interval: 250 },
    });

    expectTypeOf(composition).toEqualTypeOf<Composition<State, Context>>();
    expectTypeOf(composition.state.count).toEqualTypeOf<Signal<number | undefined>>();
    expectTypeOf(composition.context.el).toEqualTypeOf<Signal<Surface | undefined>>();
  });

  it('passes through behavior deps shape', () => {
    interface State {
      count?: number;
    }
    interface Context {
      el?: Surface;
    }
    interface Cfg {
      interval?: number;
    }

    const behavior: Behavior<State, Context, Cfg> = {
      stateKeys: [],
      contextKeys: [],
      setup: ({ state, context, config }) => {
        expectTypeOf(state).toEqualTypeOf<StateSignals<State>>();
        expectTypeOf(context).toEqualTypeOf<ContextSignals<Context>>();
        expectTypeOf(config).toEqualTypeOf<Cfg>();
      },
    };

    const state: StateSignals<State> = { count: signal<number | undefined>(undefined) };
    const context: ContextSignals<Context> = { el: signal<Surface | undefined>(undefined) };
    createComposition([behavior], { state, context, config: { interval: 250 } });
  });
});
