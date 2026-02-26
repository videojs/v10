import { PopoverDataAttrs } from '@videojs/core';
import { applyStateDataAttrs, getAnchorPositionStyle } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';
import { SnapshotController } from '@videojs/store/html';
import { applyStyles } from '@videojs/utils/dom';

import { MediaElement } from '../media-element';
import { type PopoverContextValue, popoverContext } from './popover-context';

export class PopoverPositionerElement extends MediaElement {
  static readonly tagName = 'media-popover-positioner';

  #ctx: PopoverContextValue | null = null;
  #snapshot: SnapshotController<any> | null = null;
  #anchorName = `popover-${Math.random().toString(36).slice(2, 8)}`;

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

    // Hide when closed
    if (!state.open && state.transitionStatus === 'closed') {
      this.style.display = 'none';
      return;
    }

    this.style.display = '';
    this.setAttribute('role', 'presentation');

    // Apply positioning styles
    const positioningStyle = getAnchorPositionStyle(this.#anchorName, {
      side: state.side,
      align: state.align,
      sideOffset: state.sideOffset,
      alignOffset: state.alignOffset,
    });

    applyStyles(this, positioningStyle);
    applyStateDataAttrs(this, state, PopoverDataAttrs);
  }
}
