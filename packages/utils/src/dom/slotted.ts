import type { Falsy } from '../types';

/**
 * Finds the first element in a slot's assigned elements that matches a predicate.
 *
 * @param shadowRoot - The shadow root containing the slot
 * @param slotName - The slot name to search (empty string for default slot)
 * @param predicate - Function that returns the element if it matches, or falsy if not
 * @returns The first matching element, or null if not found
 *
 * @example
 * ```ts
 * // Find a video element in the default slot
 * const video = getSlottedElement(
 *   this.shadowRoot,
 *   '',
 *   el => el instanceof HTMLVideoElement,
 * );
 * ```
 */
export function getSlottedElement<T extends Element>(
  shadowRoot: ShadowRoot,
  slotName: string,
  predicate: (el: Element) => Falsy<T>,
): T | null {
  const selector = slotName ? `slot[name="${slotName}"]` : 'slot:not([name])';
  const slot = shadowRoot.querySelector<HTMLSlotElement>(selector);

  if (!slot) return null;

  for (const el of slot.assignedElements({ flatten: true })) {
    const result = predicate(el);
    if (result) return result;
  }

  return null;
}
