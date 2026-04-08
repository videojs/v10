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

interface GestureBinding {
  options: GestureOptions;
  /** Registration order for tie-breaking. */
  id: number;
}

export class GestureCoordinator {
  #target: HTMLElement;
  #bindings: GestureBinding[] = [];
  #nextId = 0;
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
    const binding: GestureBinding = { options, id: this.#nextId++ };

    this.#bindings.push(binding);
    this.#connect();

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;

      const idx = this.#bindings.indexOf(binding);
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
    const activeRegions = this.#getActiveRegions(pointerType);
    const region = activeRegions.size > 0 ? resolveRegion(event.clientX, rect, activeRegions) : null;

    // Find matching bindings for this pointer event.
    const tapBindings = this.#matchBindings('tap', pointerType, region);
    const doubletapBindings = this.#matchBindings('doubletap', pointerType, region);

    if (tapBindings.length === 0 && doubletapBindings.length === 0) return;

    // If doubletap bindings exist, check for doubletap first.
    if (doubletapBindings.length > 0) {
      const now = Date.now();
      const isDoubleTap =
        now - this.#lastTapTime < DOUBLETAP_WINDOW &&
        this.#lastTapPointerType === pointerType &&
        this.#lastTapRegion === region;

      if (isDoubleTap) {
        // Doubletap detected — cancel pending tap timer, fire doubletap.
        this.#clearTapTimer();
        this.#lastTapTime = 0;
        this.#fireFirst(doubletapBindings, event);
        return;
      }

      // First tap — defer to allow doubletap window.
      this.#lastTapTime = now;
      this.#lastTapRegion = region;
      this.#lastTapPointerType = pointerType;

      if (tapBindings.length > 0) {
        // Delay tap to wait for potential second tap.
        this.#clearTapTimer();
        this.#tapTimer = setTimeout(() => {
          this.#tapTimer = null;
          this.#lastTapTime = 0;
          this.#fireFirst(tapBindings, event);
        }, DOUBLETAP_WINDOW);
      }

      return;
    }

    // No doubletap bindings — fire tap immediately.
    this.#fireFirst(tapBindings, event);
  };

  /** Fire the first matching binding (registration order). */
  #fireFirst(bindings: GestureBinding[], event: PointerEvent): void {
    const binding = bindings[0];
    if (binding) {
      binding.options.onActivate(event);
    }
  }

  /** Get all named regions that have active bindings for a pointer type. */
  #getActiveRegions(pointerType: string): Set<GestureRegion> {
    const regions = new Set<GestureRegion>();
    for (const { options } of this.#bindings) {
      if (options.disabled) continue;
      if (options.pointer && options.pointer !== pointerType) continue;
      if (options.region) regions.add(options.region);
    }
    return regions;
  }

  /** Find bindings matching a gesture type, pointer, and region. */
  #matchBindings(type: GestureType, pointerType: string, region: GestureRegion | null): GestureBinding[] {
    const matches: GestureBinding[] = [];

    for (const binding of this.#bindings) {
      const { options } = binding;

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

      matches.push(binding);
    }

    return matches;
  }
}
