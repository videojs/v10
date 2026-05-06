import { applyElementProps } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { MediaElement } from '../media-element';

export class MenuItemIndicatorElement extends MediaElement {
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
