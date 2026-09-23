import { applyElementProps } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { UIElement } from '../ui-element';

/**
 * Decorative checked-state mark inside a menu item, hidden from assistive technology. It stays `hidden` unless
 * `checked` or `force-mount` is set; option radio groups set `checked` on the indicators in the items they generate.
 */
export class MenuItemIndicatorElement extends UIElement {
  static readonly tagName = 'media-menu-item-indicator';

  static override properties = {
    checked: { type: Boolean },
    forceMount: { type: Boolean, attribute: 'force-mount' },
  } satisfies PropertyDeclarationMap<'checked' | 'forceMount'>;

  checked = false;
  forceMount = false;

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const hidden = !this.checked && !this.forceMount;

    applyElementProps(this, {
      'aria-hidden': 'true',
      hidden: hidden,
    });
  }
}
