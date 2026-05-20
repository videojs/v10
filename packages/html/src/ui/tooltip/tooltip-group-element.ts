import { TooltipGroupCore } from '@videojs/core';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { tooltipGroupContext } from './context';

/** Custom element shell for the `<media-tooltip-group>` tag — coordinates open/close timing across nested tooltips so subsequent hovers open instantly. */
export class TooltipGroupElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-tooltip-group';

  static override properties = {
    delay: { type: Number },
    closeDelay: { type: Number, attribute: 'close-delay' },
    timeout: { type: Number },
  } satisfies PropertyDeclarationMap<keyof TooltipGroupCore.Props>;

  /** Milliseconds to wait before opening the first tooltip in the group. */
  delay = TooltipGroupCore.defaultProps.delay;
  /** Milliseconds to wait before closing once hover/focus leaves the group. */
  closeDelay = TooltipGroupCore.defaultProps.closeDelay;
  /** Milliseconds after the last tooltip closes before the group resets its eager-open state. */
  timeout = TooltipGroupCore.defaultProps.timeout;

  readonly #core = new TooltipGroupCore();
  readonly #provider = new ContextProvider(this, { context: tooltipGroupContext, initialValue: this.#core });

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);
    this.#core.setProps(this);
    this.#provider.setValue(this.#core);
  }
}
