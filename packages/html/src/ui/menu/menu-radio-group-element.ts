import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext, menuRadioGroupContext } from './context';

/** Custom element shell for the `<media-menu-radio-group>` tag — exclusive-select group of `<media-menu-radio-item>` children. */
export class MenuRadioGroupElement extends MediaElement {
  /** Custom element tag name. */
  static readonly tagName: string = 'media-menu-radio-group';

  static override properties = {
    value: { type: String },
    label: { type: String },
  } satisfies PropertyDeclarationMap<'value' | 'label'>;

  /** Currently selected radio value. */
  value = '';
  /** Accessible label announced for the group. */
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
