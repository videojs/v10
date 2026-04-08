import { listen } from '@videojs/utils/dom';

import type { GestureRegion } from './region';
import { resolveRegion } from './region';

const TAP_THRESHOLD = 250;

export type GestureType = 'tap' | 'doubletap';
export type GesturePointerType = 'mouse' | 'touch' | 'pen';

export interface GestureOptions {
  type: GestureType;
  onActivate: (event: PointerEvent) => void;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

/**
 * Callback invoked on each quick pointer-up with matched bindings.
 * Recognizers use this to implement tap timing and doubletap disambiguation.
 */
export type GestureHandler = (
  event: PointerEvent,
  tapMatches: GestureOptions[],
  doubletapMatches: GestureOptions[]
) => void;

export class GestureCoordinator {
  #target: HTMLElement;
  #bindings: GestureOptions[] = [];
  #disconnect: AbortController | null = null;
  #destroyed = false;
  #pointerDownTime = 0;
  #handler: GestureHandler;

  constructor(target: HTMLElement, handler: GestureHandler) {
    this.#target = target;
    this.#handler = handler;
  }

  add(options: GestureOptions): () => void {
    this.#bindings.push(options);
    this.#connect();

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;

      const idx = this.#bindings.indexOf(options);
      if (idx !== -1) this.#bindings.splice(idx, 1);

      this.#maybeDisconnect();
    };
  }

  /** Re-match bindings for a gesture type. Used by recognizers that defer firing. */
  matchBindings(type: GestureType, pointerType: string, clientX: number): GestureOptions[] {
    const regions = this.#getActiveRegions(type, pointerType);
    const rect = this.#target.getBoundingClientRect();
    const region = regions.size > 0 ? resolveRegion(clientX, rect, regions) : null;
    return this.#filterBindings(type, pointerType, region);
  }

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#bindings = [];
  }

  // --- Private ---

  #connect(): void {
    if (this.#disconnect) return;
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;

    listen(this.#target, 'pointerdown', this.#onPointerDown, { signal });
    listen(this.#target, 'pointerup', this.#onPointerUp as EventListener, { signal });
  }

  #maybeDisconnect(): void {
    if (this.#bindings.length > 0) return;
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  #onPointerDown = (): void => {
    this.#pointerDownTime = Date.now();
  };

  #onPointerUp = (event: PointerEvent): void => {
    // Not a quick tap — ignore.
    if (Date.now() - this.#pointerDownTime > TAP_THRESHOLD) return;

    const pointerType = event.pointerType;
    const rect = this.#target.getBoundingClientRect();

    // Resolve regions per gesture type — doubletap regions must not suppress full-surface taps.
    const tapRegions = this.#getActiveRegions('tap', pointerType);
    const tapRegion = tapRegions.size > 0 ? resolveRegion(event.clientX, rect, tapRegions) : null;
    const tapMatches = this.#filterBindings('tap', pointerType, tapRegion);

    const doubletapRegions = this.#getActiveRegions('doubletap', pointerType);
    const doubletapRegion = doubletapRegions.size > 0 ? resolveRegion(event.clientX, rect, doubletapRegions) : null;
    const doubletapMatches = this.#filterBindings('doubletap', pointerType, doubletapRegion);

    if (tapMatches.length === 0 && doubletapMatches.length === 0) return;

    this.#handler(event, tapMatches, doubletapMatches);
  };

  #getActiveRegions(type: GestureType, pointerType: string): Set<GestureRegion> {
    const regions = new Set<GestureRegion>();
    for (const options of this.#bindings) {
      if (options.disabled) continue;
      if (options.type !== type) continue;
      if (options.pointer && options.pointer !== pointerType) continue;
      if (options.region) regions.add(options.region);
    }
    return regions;
  }

  #filterBindings(type: GestureType, pointerType: string, region: GestureRegion | null): GestureOptions[] {
    const matches: GestureOptions[] = [];

    for (const options of this.#bindings) {
      if (options.disabled) continue;
      if (options.type !== type) continue;
      if (options.pointer && options.pointer !== pointerType) continue;

      // Region matching: region binding matches its zone, full-surface matches outside regions.
      if (options.region) {
        if (options.region !== region) continue;
      } else if (region !== null) {
        // Full-surface gesture, but pointer is in a named region — skip (region takes priority).
        continue;
      }

      matches.push(options);
    }

    return matches;
  }
}
