import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { radioGroupContext } from './context';

export class RadioGroupElement extends MediaElement {
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
