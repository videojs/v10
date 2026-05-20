import { applyElementProps, getMenuRootViewAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { MediaElement } from '../media-element';

/** Custom element shell for the `<media-menu-view>` tag — wraps the root menu view for submenu push/pop transitions. */
export class MenuViewElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName = 'media-menu-view';

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    applyElementProps(this, getMenuRootViewAttrs());
  }
}
