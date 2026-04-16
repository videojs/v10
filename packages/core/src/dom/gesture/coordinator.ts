import { isInteractiveTarget, listen } from '@videojs/utils/dom';

import type {
  GestureActivateEvent,
  GestureBinding,
  GestureMatchResult,
  GestureRecognizer,
  GestureRegion,
  GestureType,
} from './gesture';
import { resolveRegion } from './region';

const TAP_THRESHOLD = 250;

export class GestureCoordinator {
  #target: HTMLElement;
  #bindings: GestureBinding[] = [];
  #recognizers = new Set<GestureRecognizer>();
  #disconnect: AbortController | null = null;
  #subscribers = new Set<(event: GestureActivateEvent) => void>();

  constructor(target: HTMLElement) {
    this.#target = target;
  }

  get bindings(): readonly GestureBinding[] {
    return this.#bindings;
  }

  subscribe(callback: (event: GestureActivateEvent) => void): () => void {
    this.#subscribers.add(callback);
    return () => this.#subscribers.delete(callback);
  }

  add(binding: GestureBinding): () => void {
    const wrapped: GestureBinding = {
      ...binding,
      onActivate: (event) => {
        if (this.#subscribers.size > 0) {
          const activateEvent: GestureActivateEvent = {
            type: binding.type,
            action: binding.action,
            value: binding.value,
            region: binding.region,
            pointer: binding.pointer,
            event,
          };
          for (const cb of this.#subscribers) cb(activateEvent);
        }
        binding.onActivate(event);
      },
    };

    this.#bindings.push(wrapped);
    this.#recognizers.add(wrapped.recognizer);
    this.#connect();

    let removed = false;
    return () => {
      if (removed) return;
      removed = true;

      const idx = this.#bindings.indexOf(wrapped);
      if (idx !== -1) this.#bindings.splice(idx, 1);

      this.#maybeDisconnect();
    };
  }

  // --- Private ---

  #connect(): void {
    if (this.#disconnect) return;
    this.#disconnect = new AbortController();
    const { signal } = this.#disconnect;

    let pointerDownTime = 0;

    listen(
      this.#target,
      'pointerdown',
      (event) => {
        if (event.button !== 0) return;
        pointerDownTime = Date.now();
      },
      { signal }
    );

    listen(
      this.#target,
      'pointerup',
      (event) => {
        if (event.button !== 0) return;
        if (Date.now() - pointerDownTime > TAP_THRESHOLD) return;
        if (isInteractiveTarget(event)) return;

        const pointerType = event.pointerType;
        const clientX = event.clientX;
        const target = this.#target;
        const bindings = this.#bindings;

        const matches: GestureMatchResult = {
          resolve: (type) => matchBindings(bindings, type, pointerType, clientX, target),
        };

        for (const recognizer of this.#recognizers) {
          recognizer.handleUp(matches, event);
        }
      },
      { signal }
    );
  }

  #maybeDisconnect(): void {
    if (this.#bindings.length > 0) return;

    for (const recognizer of this.#recognizers) {
      recognizer.reset();
    }

    this.#recognizers.clear();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }
}

const coordinators = new WeakMap<HTMLElement, GestureCoordinator>();

/** Look up the gesture coordinator for a target element, if one exists. */
export function findGestureCoordinator(target: HTMLElement): GestureCoordinator | undefined {
  return coordinators.get(target);
}

export function getGestureCoordinator(target: HTMLElement): GestureCoordinator {
  let coordinator = coordinators.get(target);
  if (!coordinator) {
    coordinator = new GestureCoordinator(target);
    coordinators.set(target, coordinator);
  }
  return coordinator;
}

// --- Matching ---

function matchBindings(
  bindings: GestureBinding[],
  type: GestureType,
  pointerType: string,
  clientX: number,
  target: HTMLElement
): GestureBinding[] {
  const rect = target.getBoundingClientRect();
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

function getActiveRegions(bindings: GestureBinding[], type: GestureType, pointerType: string): Set<GestureRegion> {
  const regions = new Set<GestureRegion>();
  for (const binding of bindings) {
    if (binding.disabled) continue;
    if (binding.type !== type) continue;
    if (binding.pointer && binding.pointer !== pointerType) continue;
    if (binding.region) regions.add(binding.region);
  }
  return regions;
}
