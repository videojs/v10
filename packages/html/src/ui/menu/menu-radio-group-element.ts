import { applyElementProps } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuRadioGroupContext } from './context';

export class MenuRadioGroupElement extends MediaElement {
  static readonly tagName: string = 'media-menu-radio-group';

  static override properties = {
    value: { type: String },
    label: { type: String },
  } satisfies PropertyDeclarationMap<'value' | 'label'>;

  value = '';
  label: string | undefined = undefined;

  readonly #provider = new ContextProvider(this, { context: menuRadioGroupContext });

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    applyElementProps(this, {
      role: 'group',
      'aria-label': this.label,
    });
    this.#provider.setValue({
      value: this.value,
      onValueChange: (next: string) => {
        this.value = next;
        this.dispatchEvent(new CustomEvent('value-change', { detail: { value: next }, bubbles: true }));
      },
    });
  }
}
