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

// --- Internal types ---

interface GestureBinding {
  type: 'tap' | 'doubletap';
  onActivate: (event: PointerEvent) => void;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

// --- Per-element state ---

const TAP_THRESHOLD = 250;

interface TapState {
  bindings: GestureBinding[];
  recognizer: TapRecognizer;
  disconnect: AbortController | null;
}

const states = new WeakMap<HTMLElement, TapState>();

function getState(target: HTMLElement): TapState {
  let state = states.get(target);
  if (state) return state;

  state = { bindings: [], recognizer: new TapRecognizer(), disconnect: null };
  states.set(target, state);
  return state;
}

function connect(target: HTMLElement, state: TapState): void {
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
      const doubletapMatches = matchBindings(state.bindings, 'doubletap', pointerType, event.clientX, rect);

      state.recognizer.up(
        doubletapMatches.length > 0,
        () => {
          const current = matchBindings(state.bindings, 'tap', pointerType, event.clientX, rect);
          current[0]?.onActivate(event);
        },
        () => {
          const current = matchBindings(state.bindings, 'doubletap', pointerType, event.clientX, rect);
          current[0]?.onActivate(event);
        }
      );
    }) as EventListener,
    { signal }
  );
}

function maybeDisconnect(state: TapState): void {
  if (state.bindings.length > 0) return;
  state.recognizer.reset();
  state.disconnect?.abort();
  state.disconnect = null;
}

function addBinding(target: HTMLElement, binding: GestureBinding): () => void {
  const state = getState(target);
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
  return addBinding(target, {
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
  return addBinding(target, {
    type: 'doubletap',
    onActivate,
    pointer: options?.pointer,
    region: options?.region,
    disabled: options?.disabled,
  });
}
