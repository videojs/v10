import { redispatchEvent } from './redispatch-event';

export interface EventForwarderOptions {
  /** Return `false` to prevent an event from being forwarded. */
  readonly filter?: (event: Event) => boolean;
}

/** Lazily forward selected event types from one target to another. */
export class EventForwarder {
  #source: EventTarget;
  #target: EventTarget;
  #filter: ((event: Event) => boolean) | undefined;
  #types = new Set<string>();

  #forward = (event: Event) => {
    if (this.#filter?.(event) === false) return;

    redispatchEvent(this.#target, event);
  };

  constructor(source: EventTarget, target: EventTarget, options: EventForwarderOptions = {}) {
    this.#source = source;
    this.#target = target;
    this.#filter = options.filter;
  }

  /** Subscribe to and forward one event type. Repeated calls for the same type have no effect. */
  forward(type: string): void {
    if (this.#types.has(type)) return;

    this.#types.add(type);
    this.#source.addEventListener(type, this.#forward);
  }

  /** Stop forwarding every subscribed event type. */
  dispose(): void {
    for (const type of this.#types) this.#source.removeEventListener(type, this.#forward);

    this.#types.clear();
  }
}
