import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuSeparatorElement extends MediaElement {
  static readonly tagName = 'media-menu-separator';

  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    applyElementProps(this, { role: 'separator' });

    const ctx = this.#ctx.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
