import { listen } from '@videojs/utils/dom';

import type { GestureRegion } from './region';
import { resolveRegion } from './region';

export type GesturePointerType = 'mouse' | 'touch' | 'pen';

export interface GestureBinding {
  type: string;
  onActivate: (event: PointerEvent) => void;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

const TAP_THRESHOLD = 250;

/**
 * Callback invoked on each quick pointer-up.
 * Receives the event and the full binding list — the handler is responsible
 * for matching and firing.
 */
export type PointerTapHandler = (event: PointerEvent, bindings: GestureBinding[], rect: DOMRect) => void;

export interface GestureState {
  bindings: GestureBinding[];
  disconnect: AbortController | null;
  handler: PointerTapHandler | null;
}

const states = new WeakMap<HTMLElement, GestureState>();

export function getState(target: HTMLElement): GestureState {
  let state = states.get(target);
  if (state) return state;

  state = { bindings: [], disconnect: null, handler: null };
  states.set(target, state);
  return state;
}

export function connectListeners(target: HTMLElement, state: GestureState): void {
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
      if (!state.handler) return;
      const rect = target.getBoundingClientRect();
      state.handler(event, state.bindings, rect);
    }) as EventListener,
    { signal }
  );
}

export function disconnectIfEmpty(state: GestureState): void {
  if (state.bindings.length > 0) return;
  state.disconnect?.abort();
  state.disconnect = null;
  state.handler = null;
}

export function addBinding(target: HTMLElement, state: GestureState, binding: GestureBinding): () => void {
  state.bindings.push(binding);
  connectListeners(target, state);

  let removed = false;
  return () => {
    if (removed) return;
    removed = true;

    const idx = state.bindings.indexOf(binding);
    if (idx !== -1) state.bindings.splice(idx, 1);

    disconnectIfEmpty(state);
  };
}

/** Match bindings by type, pointer, and region. */
export function matchBindings(
  bindings: GestureBinding[],
  type: string,
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

function getActiveRegions(bindings: GestureBinding[], type: string, pointerType: string): Set<GestureRegion> {
  const regions = new Set<GestureRegion>();
  for (const binding of bindings) {
    if (binding.disabled) continue;
    if (binding.type !== type) continue;
    if (binding.pointer && binding.pointer !== pointerType) continue;
    if (binding.region) regions.add(binding.region);
  }
  return regions;
}
