import { PopoverDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';

import { MediaElement } from '../media-element';
import { type PopoverContextValue, popoverContext } from './popover-context';

export class PopoverPopupElement extends MediaElement {
  static readonly tagName = 'media-popover-popup';

  #ctx: PopoverContextValue | null = null;
  #snapshot: SnapshotController<any> | null = null;

  #consumer = new ContextConsumer(this, {
    context: popoverContext,
    subscribe: true,
    callback: (value: PopoverContextValue) => {
      this.#ctx = value;
      value.popover.setPopupElement(this);

      if (!this.#snapshot) {
        this.#snapshot = new SnapshotController(this, value.interaction);
      } else {
        this.#snapshot.track(value.interaction);
      }

      this.requestUpdate();
    },
  });

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();

    if (this.#ctx) {
      applyElementProps(this, this.#ctx.popover.popupProps, this.#disconnect.signal);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;

    if (this.#ctx) {
      this.#ctx.popover.setPopupElement(null);
    }
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#consumer.value ?? this.#ctx;
    if (!ctx) return;

    const interaction = ctx.interaction.current;
    const state = ctx.core.getState(interaction);

    applyElementProps(this, ctx.core.getPopupAttrs(state));
    applyStateDataAttrs(this, state, PopoverDataAttrs);

    // Re-apply popup props if first update after context arrival
    if (this.#disconnect && !this.hasUpdated) {
      applyElementProps(this, ctx.popover.popupProps, this.#disconnect.signal);
    }
  }
}
