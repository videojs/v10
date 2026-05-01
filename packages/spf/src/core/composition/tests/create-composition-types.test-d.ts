import { describe, expectTypeOf, it } from 'vitest';
import { type Signal, signal } from '../../signals/primitives';
import {
  type Behavior,
  type BehaviorDeps,
  type Composition,
  type ContextSignals,
  createComposition,
  type StateSignals,
} from '../create-composition';

// =============================================================================
// Stage A note
// -----------------------------------------------------------------------------
// The composition-time type-conflict machinery (InferBehaviorState,
// ResolveBehaviorOwners, ValidateComposition, etc.) was removed in stage A.
// Compile-time enforcement of behavior compatibility is intentionally out of
// scope here — Stage B will rebuild it on top of per-behavior key declarations
// (the `stateKeys`/`contextKeys`/`writeKeys` shape from the meeting follow-up).
//
// What these tests cover is the surface that *did* survive stage A:
//   - StateSignals<S> / ContextSignals<C> shapes (one signal per declared field)
//   - The explicit-typed createComposition signature
//   - Composition<S, C> and BehaviorDeps<S, C, Cfg> shapes the engine works with
// =============================================================================

interface Surface {
  textContent?: string | null;
}

describe('StateSignals', () => {
  it('produces one signal per state field', () => {
    type Map = StateSignals<{ count?: number; label?: string }>;
    expectTypeOf<Map['count']>().toEqualTypeOf<Signal<number | undefined>>();
    expectTypeOf<Map['label']>().toEqualTypeOf<Signal<string | undefined>>();
  });

  it('strips optionality on signal slots while preserving undefined in value type', () => {
    type Map = StateSignals<{ count?: number }>;
    // No optional `?:` on the signal slot itself — every key has a signal.
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

describe('createComposition', () => {
  it('returns Composition<S, C> when called with explicit type arguments', () => {
    interface State {
      count?: number;
    }
    interface Context {
      el?: Surface;
    }
    interface Cfg {
      interval?: number;
    }

    const state: StateSignals<State> = { count: signal<number | undefined>(undefined) };
    const context: ContextSignals<Context> = { el: signal<Surface | undefined>(undefined) };
    const composition = createComposition<State, Context, Cfg>([], {
      state,
      context,
      config: { interval: 250 },
    });

    expectTypeOf(composition).toEqualTypeOf<Composition<State, Context>>();
    expectTypeOf(composition.state.count).toEqualTypeOf<Signal<number | undefined>>();
    expectTypeOf(composition.context.el).toEqualTypeOf<Signal<Surface | undefined>>();
  });

  it('passes through behavior shapes', () => {
    interface State {
      count?: number;
    }
    interface Context {
      el?: Surface;
    }
    interface Cfg {
      interval?: number;
    }

    const behavior: Behavior<State, Context, Cfg> = ({ state, context, config }) => {
      expectTypeOf(state).toEqualTypeOf<StateSignals<State>>();
      expectTypeOf(context).toEqualTypeOf<ContextSignals<Context>>();
      expectTypeOf(config).toEqualTypeOf<Cfg>();
    };

    const state: StateSignals<State> = { count: signal<number | undefined>(undefined) };
    const context: ContextSignals<Context> = { el: signal<Surface | undefined>(undefined) };
    createComposition<State, Context, Cfg>([behavior], { state, context, config: { interval: 250 } });
  });
});
