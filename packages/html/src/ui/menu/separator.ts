import { applyElementProps } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { UIElement } from '../ui-element';

/** Visual divider between groups of menu items; the element itself takes `role="separator"`. */
export class MenuSeparatorElement extends UIElement {
  static readonly tagName = 'media-menu-separator';

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    applyElementProps(this, { role: 'separator' });
  }
}
