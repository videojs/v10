import { applyElementProps } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { MediaElement } from '../media-element';

export class MenuGroupElement extends MediaElement {
  static readonly tagName = 'media-menu-group';

  static override properties = {
    label: { type: String },
  } satisfies PropertyDeclarationMap<'label'>;

  label: string | undefined = undefined;

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    applyElementProps(this, {
      role: 'group',
      'aria-label': this.label,
    });
  }
}
