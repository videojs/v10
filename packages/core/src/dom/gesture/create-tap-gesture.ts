import { GestureCoordinator } from './coordinator';
import type { GestureOptions } from './gesture';
import { TapRecognizer } from './tap';

const coordinators = new WeakMap<HTMLElement, GestureCoordinator>();

function getCoordinator(target: HTMLElement): GestureCoordinator {
  let coordinator = coordinators.get(target);
  if (coordinator) return coordinator;

  coordinator = new GestureCoordinator(target, new TapRecognizer());
  coordinators.set(target, coordinator);
  return coordinator;
}

/**
 * Register a tap gesture on a target element.
 *
 * @example
 * ```ts
 * const cleanup = createTapGesture(container, (event) => {
 *   store.paused ? store.play() : store.pause();
 * }, { pointer: 'mouse' });
 * ```
 */
export function createTapGesture(
  target: HTMLElement,
  onActivate: (event: PointerEvent) => void,
  options?: GestureOptions
): () => void {
  return getCoordinator(target).add({
    type: 'tap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  });
}

/**
 * Register a doubletap gesture on a target element.
 *
 * @example
 * ```ts
 * const cleanup = createDoubleTapGesture(container, (event) => {
 *   store.fullscreen ? store.exitFullscreen() : store.requestFullscreen();
 * }, { region: 'center' });
 * ```
 */
export function createDoubleTapGesture(
  target: HTMLElement,
  onActivate: (event: PointerEvent) => void,
  options?: GestureOptions
): () => void {
  return getCoordinator(target).add({
    type: 'doubletap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  });
}
