import { isObject } from '../predicate/predicate';

/**
 * A function that selects a subset of state.
 */
export type Selector<State, Selected> = (state: State) => Selected;

/**
 * Extract state keys a selector depends on. Returns null for primitives/arrays.
 *
 * @example
 * getSelectorKeys((s) => ({ volume: s.volume }), state); // ['volume']
 */
export function getSelectorKeys<State, Selected>(
  selector: Selector<State, Selected>,
  state: State,
): (keyof State)[] | null {
  const result = selector(state);

  if (!isObject(result) || Array.isArray(result)) {
    return null;
  }

  return Object.keys(result) as (keyof State)[];
}
