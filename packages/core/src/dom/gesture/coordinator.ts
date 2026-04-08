import { listen } from '@videojs/utils/dom';

import type { GestureRegion } from './region';
import { resolveRegion } from './region';
import { TapRecognizer } from './tap';

export type GestureType = 'tap' | 'doubletap';
export type GesturePointerType = 'mouse' | 'touch' | 'pen';

export interface GestureOptions {
  type: GestureType;
  onActivate: (event: PointerEvent) => void;
  pointer?: GesturePointerType | undefined;
  region?: GestureRegion | undefined;
  disabled?: boolean | undefined;
}

export class GestureCoordinator {
  #target: HTMLElement;
  #bindings: GestureOptions[] = [];
  #disconnect: AbortController | null = null;
  #destroyed = false;
  #tap = new TapRecognizer();

  constructor(target: HTMLElement) {
    this.#target = target;
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

  destroy(): void {
    if (this.#destroyed) return;
    this.#destroyed = true;
    this.#tap.reset();
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
    this.#tap.reset();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  #onPointerDown = (): void => {
    this.#tap.down();
  };

  #onPointerUp = (event: PointerEvent): void => {
    const pointerType = event.pointerType;
    const rect = this.#target.getBoundingClientRect();

    // Resolve regions per gesture type — doubletap regions must not suppress full-surface taps.
    const doubletapRegions = this.#getActiveRegions('doubletap', pointerType);
    const doubletapRegion = doubletapRegions.size > 0 ? resolveRegion(event.clientX, rect, doubletapRegions) : null;
    const doubletapMatches = this.#matchBindings('doubletap', pointerType, doubletapRegion);

    this.#tap.up(
      doubletapMatches.length > 0,
      // onTap — re-match at fire time to avoid stale closures over removed bindings.
      () => {
        const tapRegions = this.#getActiveRegions('tap', pointerType);
        const tapRegion = tapRegions.size > 0 ? resolveRegion(event.clientX, rect, tapRegions) : null;
        const tapMatches = this.#matchBindings('tap', pointerType, tapRegion);
        tapMatches[0]?.onActivate(event);
      },
      // onDoubleTap
      () => {
        doubletapMatches[0]?.onActivate(event);
      }
    );
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

  #matchBindings(type: GestureType, pointerType: string, region: GestureRegion | null): GestureOptions[] {
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
