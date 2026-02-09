import type { StateAttrMap } from '../../core/ui/types';

/**
 * Convert state object to data attributes.
 *
 * - `true` → `data-keyname=""`
 * - truthy string/number → `data-keyname="value"`
 * - falsy → no attribute
 *
 * @example
 * ```ts
 * const state = { paused: true, ended: false, volume: 0.5 };
 * getStateDataAttrs(state);
 * // { 'data-paused': '', 'data-volume': '0.5' }
 * ```
 *
 * When a mapping is provided, only mapped keys are converted.
 */
export function getStateDataAttrs<State extends object>(
  state: State,
  map?: StateAttrMap<State>
): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const key in state) {
    if (map && !(key in map)) continue;

    const name = map?.[key] ?? toDataAttrName(key),
      value = state[key];

    if (value === true) {
      attrs[name] = '';
    } else if (value) {
      attrs[name] = String(value);
    }
  }

  return attrs;
}

/**
 * Apply state as data attributes to an element.
 *
 * - `true` → sets `data-keyname=""`
 * - truthy string/number → sets `data-keyname="value"`
 * - falsy → removes the attribute
 *
 * @example
 * ```ts
 * const state = { paused: true, ended: false };
 * applyStateDataAttrs(element, state);
 * // element has data-paused="", data-ended is removed
 * ```
 */
export function applyStateDataAttrs<State extends object>(
  element: HTMLElement,
  state: State,
  map?: StateAttrMap<State>
): void {
  for (const key in state) {
    if (map && !(key in map)) continue;

    const name = map?.[key] ?? toDataAttrName(key),
      value = state[key];

    if (value === true) {
      element.setAttribute(name, '');
    } else if (value) {
      element.setAttribute(name, String(value));
    } else {
      element.removeAttribute(name);
    }
  }
}

function toDataAttrName(key: string): string {
  return `data-${key.toLowerCase()}`;
}
