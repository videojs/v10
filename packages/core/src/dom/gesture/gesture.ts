import { listen } from '@videojs/utils/dom';

import type { GestureRegion } from './region';
import { resolveRegion } from './region';
import { TapRecognizer } from './tap';

export type GesturePointerType = 'mouse' | 'touch' | 'pen';

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

// --- Binding types ---

interface GestureBinding {
  type: 'tap' | 'doubletap';
  onActivate: (event: PointerEvent) => void;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

// --- Per-element shared state ---

const TAP_THRESHOLD = 250;

interface GestureState {
  bindings: GestureBinding[];
  recognizer: TapRecognizer;
  disconnect: AbortController | null;
}

const states = new WeakMap<HTMLElement, GestureState>();

function getState(target: HTMLElement): GestureState {
  let state = states.get(target);
  if (state) return state;

  const recognizer = new TapRecognizer();
  state = { bindings: [], recognizer, disconnect: null };
  states.set(target, state);
  return state;
}

function connect(target: HTMLElement, state: GestureState): void {
  if (state.disconnect) return;
  state.disconnect = new AbortController();
  const { signal } = state.disconnect;

  let pointerDownTime = 0;

  listen(
    target,
    'pointerdown',
    () => {
      pointerDownTime = Date.now();
    },
    { signal }
  );

  listen(
    target,
    'pointerup',
    ((event: PointerEvent) => {
      if (Date.now() - pointerDownTime > TAP_THRESHOLD) return;

      const pointerType = event.pointerType;
      const rect = target.getBoundingClientRect();

      // Match per type — doubletap regions must not suppress full-surface taps.
      const doubletapMatches = matchBindings(state.bindings, 'doubletap', pointerType, event.clientX, rect);

      state.recognizer.up(
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
    }) as EventListener,
    { signal }
  );
}

function maybeDisconnect(state: GestureState): void {
  if (state.bindings.length > 0) return;
  state.recognizer.reset();
  state.disconnect?.abort();
  state.disconnect = null;
}

// --- Matching ---

function matchBindings(
  bindings: GestureBinding[],
  type: 'tap' | 'doubletap',
  pointerType: string,
  clientX: number,
  rect: DOMRect
): GestureBinding[] {
  const activeRegions = getActiveRegions(bindings, type, pointerType);
  const region = activeRegions.size > 0 ? resolveRegion(clientX, rect, activeRegions) : null;

  const matches: GestureBinding[] = [];

  for (const binding of bindings) {
    if (binding.disabled) continue;
    if (binding.type !== type) continue;
    if (binding.pointer && binding.pointer !== pointerType) continue;

    if (binding.region) {
      if (binding.region !== region) continue;
    } else if (region !== null) {
      continue;
    }

    matches.push(binding);
  }

  return matches;
}

function getActiveRegions(
  bindings: GestureBinding[],
  type: 'tap' | 'doubletap',
  pointerType: string
): Set<GestureRegion> {
  const regions = new Set<GestureRegion>();
  for (const binding of bindings) {
    if (binding.disabled) continue;
    if (binding.type !== type) continue;
    if (binding.pointer && binding.pointer !== pointerType) continue;
    if (binding.region) regions.add(binding.region);
  }
  return regions;
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
  const state = getState(target);
  const binding: GestureBinding = {
    type: 'tap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  };

  state.bindings.push(binding);
  connect(target, state);

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;

    const idx = state.bindings.indexOf(binding);
    if (idx !== -1) state.bindings.splice(idx, 1);

    maybeDisconnect(state);
  };
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
  const state = getState(target);
  const binding: GestureBinding = {
    type: 'doubletap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  };

  state.bindings.push(binding);
  connect(target, state);

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;

    const idx = state.bindings.indexOf(binding);
    if (idx !== -1) state.bindings.splice(idx, 1);

    maybeDisconnect(state);
  };
}
