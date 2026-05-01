import { describe, it } from 'vitest';
import { signal } from '../../signals/primitives';
import { type Behavior, type ContextSignals, createComposition, type StateSignals } from '../create-composition';

// =============================================================================
// Stage A note
// -----------------------------------------------------------------------------
// The composition-time conflict-detection tests (`'Error: behaviors have
// conflicting state types'`, owners-subtype compatibility, etc.) used to live
// here but the underlying type machinery was removed in stage A.
// Stage B will rebuild that surface from per-behavior `stateKeys` / `writeKeys`
// declarations, at which point a richer set of `@ts-expect-error` tests should
// return.
//
// What remains here are the @ts-expect-error checks that the explicit-typed
// signature still enforces: per-signal value types and required options.
// =============================================================================

interface Surface {
  textContent?: string | null;
}

interface State {
  count?: number;
}

interface Context {
  el?: Surface;
}

const state: StateSignals<State> = { count: signal<number | undefined>(undefined) };
const context: ContextSignals<Context> = { el: signal<Surface | undefined>(undefined) };

describe('createComposition type errors', () => {
  it('errors when set() is called on a state signal with the wrong value type', () => {
    const composition = createComposition<State, Context, object>([], { state, context });
    // @ts-expect-error — count is Signal<number | undefined>, not a string slot
    composition.state.count.set('not a number');
  });

  it('errors when get() is treated as the wrong type', () => {
    const composition = createComposition<State, Context, object>([], { state, context });
    // @ts-expect-error — count.get() returns number | undefined, not string
    const _: string = composition.state.count.get();
  });

  it('errors when state map is missing a required signal slot', () => {
    // @ts-expect-error — `state` map missing the `count` signal that State declares
    createComposition<State, Context, object>([], { state: {}, context });
  });

  it('errors when context map is missing a required signal slot', () => {
    // @ts-expect-error — `context` map missing the `el` signal that Context declares
    createComposition<State, Context, object>([], { state, context: {} });
  });

  it('errors when state and context options are omitted entirely', () => {
    // @ts-expect-error — state and context are required options
    createComposition<State, Context, object>([]);
  });

  it('errors when a behavior writes a wrong-type value to a state signal', () => {
    const badBehavior: Behavior<State, Context, object> = ({ state }) => {
      // @ts-expect-error — count is number | undefined
      state.count.set('wrong');
    };
    void badBehavior;
  });

  it('errors when a behavior reads a state signal as the wrong type', () => {
    const badBehavior: Behavior<State, Context, object> = ({ state }) => {
      // @ts-expect-error — count.get() returns number | undefined, not string
      const _: string = state.count.get();
      void _;
    };
    void badBehavior;
  });

  it('errors when state or context maps have wrong-typed signal values', () => {
    // @ts-expect-error — count signal must hold number | undefined, not string
    const _bad: StateSignals<State> = { count: signal<string | undefined>(undefined) };
  });

  // ==========================================================================
  // Stage A note: composition-time conflict detection between behaviors
  // (incompatible state types, owner subtype mismatches, etc.) is intentionally
  // gone. Stage B rebuilds that surface on top of per-behavior key declarations.
  // ==========================================================================
});
