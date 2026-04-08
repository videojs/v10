import { listen } from '@videojs/utils/dom';

import type { GestureRegion } from './region';
import { resolveRegion } from './region';

const TAP_THRESHOLD = 250;
const DOUBLETAP_WINDOW = 300;

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

  // Tap detection state
  #pointerDownTime = 0;

  // Doubletap disambiguation
  #tapTimer: ReturnType<typeof setTimeout> | null = null;
  #lastTapTime = 0;
  #lastTapRegion: GestureRegion | null = null;
  #lastTapPointerType = '';

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
    this.#clearTapTimer();
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
    this.#clearTapTimer();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  #clearTapTimer(): void {
    if (this.#tapTimer !== null) {
      clearTimeout(this.#tapTimer);
      this.#tapTimer = null;
    }
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
    const doubletapRegions = this.#getActiveRegions('doubletap', pointerType);
    const doubletapRegion = doubletapRegions.size > 0 ? resolveRegion(event.clientX, rect, doubletapRegions) : null;

    // Find matching bindings for this pointer event.
    const tapMatches = this.#matchBindings('tap', pointerType, tapRegion);
    const doubletapMatches = this.#matchBindings('doubletap', pointerType, doubletapRegion);

    if (tapMatches.length === 0 && doubletapMatches.length === 0) return;

    // If doubletap bindings exist, check for doubletap first.
    if (doubletapMatches.length > 0) {
      const now = Date.now();
      const isDoubleTap =
        now - this.#lastTapTime < DOUBLETAP_WINDOW &&
        this.#lastTapPointerType === pointerType &&
        this.#lastTapRegion === doubletapRegion;

      if (isDoubleTap) {
        // Doubletap detected — cancel pending tap timer, fire doubletap.
        this.#clearTapTimer();
        this.#lastTapTime = 0;
        this.#fireFirst(doubletapMatches, event);
        return;
      }

      // First tap — defer to allow doubletap window.
      this.#lastTapTime = now;
      this.#lastTapRegion = doubletapRegion;
      this.#lastTapPointerType = pointerType;

      if (tapMatches.length > 0) {
        // Delay tap to wait for potential second tap.
        // Re-match bindings when the timer fires to avoid stale closures
        // over bindings that may have been removed during the delay.
        this.#clearTapTimer();
        this.#tapTimer = setTimeout(() => {
          this.#tapTimer = null;
          this.#lastTapTime = 0;
          const currentTapRegions = this.#getActiveRegions('tap', pointerType);
          const currentTapRegion =
            currentTapRegions.size > 0 ? resolveRegion(event.clientX, rect, currentTapRegions) : null;
          const currentTapBindings = this.#matchBindings('tap', pointerType, currentTapRegion);
          this.#fireFirst(currentTapBindings, event);
        }, DOUBLETAP_WINDOW);
      }

      return;
    }

    // No doubletap bindings — fire tap immediately.
    this.#fireFirst(tapMatches, event);
  };

  #fireFirst(matches: GestureOptions[], event: PointerEvent): void {
    matches[0]?.onActivate(event);
  }

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
