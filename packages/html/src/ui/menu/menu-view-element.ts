import { applyElementProps, getMenuRootViewAttrs } from '@videojs/core/dom';
import type { PropertyValues } from '@videojs/element';

import { MediaElement } from '../media-element';

export class MenuViewElement extends MediaElement {
  static readonly tagName = 'media-menu-view';

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    applyElementProps(this, getMenuRootViewAttrs());
  }
}
