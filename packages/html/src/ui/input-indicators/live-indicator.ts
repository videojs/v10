import type { StateAttrMap } from '@videojs/core';
import { applyStateDataAttrs } from '@videojs/core/dom';

export interface LiveIndicatorOptions<State extends object> {
  host: HTMLElement;
  dataAttrs: StateAttrMap<State>;
  render: (element: HTMLElement, state: State) => void;
}

export class LiveIndicator<State extends object> {
  readonly #host: HTMLElement;
  readonly #dataAttrs: StateAttrMap<State>;
  readonly #render: (element: HTMLElement, state: State) => void;

  constructor(options: LiveIndicatorOptions<State>) {
    this.#host = options.host;
    this.#dataAttrs = options.dataAttrs;
    this.#render = options.render;
  }

  get element(): HTMLElement {
    return this.#host;
  }

  render(state: State): HTMLElement {
    this.#host.hidden = false;
    applyStateDataAttrs(this.#host, state, this.#dataAttrs);
    this.#render(this.#host, state);

    return this.#host;
  }

  remove(): void {
    this.#host.hidden = true;

    for (const key in this.#dataAttrs) {
      const name = this.#dataAttrs[key];
      if (name) this.#host.removeAttribute(name);
    }
  }
}
