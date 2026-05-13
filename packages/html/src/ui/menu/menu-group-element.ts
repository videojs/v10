import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuGroupElement extends MediaElement {
  static readonly tagName = 'media-menu-group';

  static override properties = {
    label: { type: String },
  } satisfies PropertyDeclarationMap<'label'>;

  label: string | undefined = undefined;

  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    applyElementProps(this, {
      role: 'group',
      'aria-label': this.label,
    });

    const ctx = this.#ctx.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
