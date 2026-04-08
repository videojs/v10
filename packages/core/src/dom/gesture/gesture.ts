import type { GestureCoordinator, GesturePointerType } from './coordinator';
import { GestureCoordinator as Coordinator } from './coordinator';
import type { GestureRegion } from './region';
import { TapRecognizer } from './tap';

// --- Coordinator management ---

interface CoordinatorEntry {
  coordinator: GestureCoordinator;
  recognizer: TapRecognizer;
}

const coordinators = new WeakMap<HTMLElement, CoordinatorEntry>();

/** Look up the coordinator for a target element, if one exists. */
export function findGestureCoordinator(target: HTMLElement): GestureCoordinator | undefined {
  return coordinators.get(target)?.coordinator;
}

function getEntry(target: HTMLElement): CoordinatorEntry {
  let entry = coordinators.get(target);
  if (!entry) {
    const recognizer = new TapRecognizer();
    const coordinator = new Coordinator(target, (event, tapMatches, doubletapMatches) => {
      recognizer.up(
        doubletapMatches.length > 0,
        // onTap — re-match at fire time to avoid stale closures over removed bindings.
        () => {
          const current = coordinator.matchBindings('tap', event.pointerType, event.clientX);
          current[0]?.onActivate(event);
        },
        // onDoubleTap — re-match at fire time, same as tap.
        () => {
          const current = coordinator.matchBindings('doubletap', event.pointerType, event.clientX);
          current[0]?.onActivate(event);
        }
      );
    });
    entry = { coordinator, recognizer };
    coordinators.set(target, entry);
  }
  return entry;
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
  const { coordinator } = getEntry(target);
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
  const { coordinator } = getEntry(target);
  return coordinator.add({
    type: 'doubletap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  });
}
