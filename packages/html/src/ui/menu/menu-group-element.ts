import type { PropertyValues } from '@videojs/element';

import { MediaElement } from '../media-element';
import { MenuGroupController } from './menu-group-controller';

export class MenuGroupElement extends MediaElement {
  static readonly tagName = 'media-menu-group';

  readonly #group = new MenuGroupController(this);

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    this.#group.applyProps();
  }
}
