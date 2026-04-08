import type { GestureCoordinator, GesturePointerType } from './coordinator';
import { GestureCoordinator as Coordinator } from './coordinator';
import type { GestureRegion } from './region';

// --- Coordinator management ---

const coordinators = new WeakMap<HTMLElement, GestureCoordinator>();

/** Look up the coordinator for a target element, if one exists. */
export function findGestureCoordinator(target: HTMLElement): GestureCoordinator | undefined {
  return coordinators.get(target);
}

function getCoordinator(target: HTMLElement): GestureCoordinator {
  let coordinator = coordinators.get(target);
  if (!coordinator) {
    coordinator = new Coordinator(target);
    coordinators.set(target, coordinator);
  }
  return coordinator;
}

// --- Factory options ---

export interface TapGestureOptions {
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

export interface DoubleTapGestureOptions {
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

// --- Factory functions ---

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
  options?: TapGestureOptions
): () => void {
  const coordinator = getCoordinator(target);
  return coordinator.add({
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
  options?: DoubleTapGestureOptions
): () => void {
  const coordinator = getCoordinator(target);
  return coordinator.add({
    type: 'doubletap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  });
}
