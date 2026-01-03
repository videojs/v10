import { isObject } from '../predicate';

/**
 * A function that selects a subset of state.
 */
export type Selector<State, Selected> = (state: State) => Selected;

/**
 * Extracts the state keys a selector depends on by running it once
 * and inspecting the result object's keys.
 *
 * Returns `null` if the selector returns a primitive or array
 * (keys cannot be determined).
 *
 * @example
 * const selector = (s: State) => ({ volume: s.volume, muted: s.muted });
 * getSelectorKeys(selector, state); // ['volume', 'muted']
 *
 * const primitiveSelector = (s: State) => s.volume;
 * getSelectorKeys(primitiveSelector, state); // null
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
