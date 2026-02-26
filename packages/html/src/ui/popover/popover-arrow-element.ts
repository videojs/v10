import { PopoverDataAttrs } from '@videojs/core';
import { applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';

import { MediaElement } from '../media-element';
import { type PopoverContextValue, popoverContext } from './popover-context';

export class PopoverArrowElement extends MediaElement {
  static readonly tagName = 'media-popover-arrow';

  #ctx: PopoverContextValue | null = null;
  #snapshot: SnapshotController<any> | null = null;

  #consumer = new ContextConsumer(this, {
    context: popoverContext,
    subscribe: true,
    callback: (value: PopoverContextValue) => {
      this.#ctx = value;

      if (!this.#snapshot) {
        this.#snapshot = new SnapshotController(this, value.interaction);
      } else {
        this.#snapshot.track(value.interaction);
      }

      this.requestUpdate();
    },
  });

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#consumer.value ?? this.#ctx;
    if (!ctx) return;

    const interaction = ctx.interaction.current;
    const state = ctx.core.getState(interaction);

    this.setAttribute('aria-hidden', 'true');
    applyStateDataAttrs(this, state, PopoverDataAttrs);
  }
}
