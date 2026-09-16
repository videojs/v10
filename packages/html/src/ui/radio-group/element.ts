import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

import { UIElement } from '../ui-element';
import { radioGroupContext } from './context';

/** @fires value-change - Fired when the selected value changes. */
export class RadioGroupElement extends UIElement {
  static override properties = {
    value: { type: String },
  } satisfies PropertyDeclarationMap<'value'>;

  value = '';

  readonly #provider = new ContextProvider(this, { context: radioGroupContext });

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    this.#provider.setValue({
      value: this.value,
      onValueChange: (next: string) => {
        this.value = next;
        this.dispatchEvent(new CustomEvent('value-change', { detail: { value: next }, bubbles: true }));
      },
    });
  }
}
