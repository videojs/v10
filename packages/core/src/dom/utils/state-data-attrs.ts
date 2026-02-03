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
 */
export function getStateDataAttrs<State extends object>(state: State): Record<string, string> {
  const attrs: Record<string, string> = {};

  for (const key in state) {
    const value = state[key];

    if (value === true) {
      attrs[`data-${key.toLowerCase()}`] = '';
    } else if (value) {
      attrs[`data-${key.toLowerCase()}`] = String(value);
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
export function applyStateDataAttrs<State extends object>(element: HTMLElement, state: State): void {
  for (const key in state) {
    const value = state[key];
    const attrName = `data-${key.toLowerCase()}`;

    if (value === true) {
      element.setAttribute(attrName, '');
    } else if (value) {
      element.setAttribute(attrName, String(value));
    } else {
      element.removeAttribute(attrName);
    }
  }
}
