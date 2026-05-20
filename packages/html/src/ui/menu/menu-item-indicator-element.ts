import { applyElementProps } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { MediaElement } from '../media-element';

/** Custom element shell for the `<media-menu-item-indicator>` tag — checkmark or icon shown when its parent item is checked/selected. */
export class MenuItemIndicatorElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-menu-item-indicator';

  static override properties = {
    checked: { type: Boolean },
    forceMount: { type: Boolean, attribute: 'force-mount' },
  } satisfies PropertyDeclarationMap<'checked' | 'forceMount'>;

  /** When true, the indicator is shown. */
  checked = false;
  /** Keep the indicator in the DOM even when unchecked (lets CSS animate it). */
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
