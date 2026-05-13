import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext, menuRadioGroupContext } from './context';

export class MenuRadioGroupElement extends MediaElement {
  static readonly tagName = 'media-menu-radio-group';

  static override properties = {
    value: { type: String },
    label: { type: String },
  } satisfies PropertyDeclarationMap<'value' | 'label'>;

  value = '';
  label: string | undefined = undefined;

  readonly #menuCtx = new ContextConsumer(this, { context: menuContext, subscribe: true });
  readonly #provider = new ContextProvider(this, { context: menuRadioGroupContext });

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    applyElementProps(this, {
      role: 'group',
      'aria-label': this.label,
    });

    const ctx = this.#menuCtx.value;
    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);

    this.#provider.setValue({
      value: this.value,
      onValueChange: (next: string) => {
        this.value = next;
        this.dispatchEvent(new CustomEvent('value-change', { detail: { value: next }, bubbles: true }));
      },
    });
  }
}
