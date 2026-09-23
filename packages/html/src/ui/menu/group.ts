import type { PropertyValues } from '@videojs/element';

import { UIElement } from '../ui-element';
import { MenuGroupController } from './group-controller';

/**
 * Groups related menu items; the element itself takes `role="group"`. A `<media-menu-group-label>` child names the
 * group unless it already has an `aria-label` or `aria-labelledby`.
 */
export class MenuGroupElement extends UIElement {
  static readonly tagName = 'media-menu-group';

  readonly #group = new MenuGroupController(this);

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    this.#group.applyProps();
  }
}
