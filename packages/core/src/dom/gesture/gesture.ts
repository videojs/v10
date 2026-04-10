import type { GestureRegion } from './region';
import type { GesturePointerType } from './shared';
import { addBinding, getState, matchBindings } from './shared';
import { TapRecognizer } from './tap';

export type { GesturePointerType } from './shared';

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

// --- Per-element recognizer (only created when tap/doubletap factories are used) ---

const recognizers = new WeakMap<HTMLElement, TapRecognizer>();

function ensureHandler(target: HTMLElement): TapRecognizer {
  const state = getState(target);
  let recognizer = recognizers.get(target);

  if (!recognizer) {
    recognizer = new TapRecognizer();
    recognizers.set(target, recognizer);

    state.handler = (event, bindings, rect) => {
      const pointerType = event.pointerType;
      const doubletapMatches = matchBindings(bindings, 'doubletap', pointerType, event.clientX, rect);

      recognizer!.up(
        doubletapMatches.length > 0,
        // onTap — re-match at fire time to avoid stale closures.
        () => {
          const current = matchBindings(state.bindings, 'tap', pointerType, event.clientX, rect);
          current[0]?.onActivate(event);
        },
        // onDoubleTap — re-match at fire time.
        () => {
          const current = matchBindings(state.bindings, 'doubletap', pointerType, event.clientX, rect);
          current[0]?.onActivate(event);
        }
      );
    };
  }

  return recognizer;
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
  ensureHandler(target);
  return addBinding(target, getState(target), {
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
  ensureHandler(target);
  return addBinding(target, getState(target), {
    type: 'doubletap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  });
}
