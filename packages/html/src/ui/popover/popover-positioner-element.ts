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

    const posOpts = {
      side: state.side,
      align: state.align,
      sideOffset: state.sideOffset,
      alignOffset: state.alignOffset,
    };

    // Measure rects for the manual fallback path.
    // getAnchorPositionStyle auto-selects CSS Anchor Positioning
    // when supported (ignoring rects), or uses the rects for JS fallback.
    const triggerEl = ctx.popover.triggerElement;
    const triggerRect = triggerEl?.getBoundingClientRect();
    const positionerRect = this.getBoundingClientRect();
    const boundaryRect = document.documentElement.getBoundingClientRect();

    const positioningStyle = getAnchorPositionStyle(ctx.anchorName, posOpts, triggerRect, positionerRect, boundaryRect);

    applyStyles(this, positioningStyle);
    applyStateDataAttrs(this, state, PopoverDataAttrs);
  }
}
