import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuRadioGroupContext } from './context';
import { MenuGroupController } from './menu-group-controller';

export class MenuRadioGroupElement extends MediaElement {
  static readonly tagName: string = 'media-menu-radio-group';

  static override properties = {
    value: { type: String },
  } satisfies PropertyDeclarationMap<'value'>;

  value = '';

  readonly #provider = new ContextProvider(this, { context: menuRadioGroupContext });
  readonly #group = new MenuGroupController(this);

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    this.#group.applyProps();

    this.#provider.setValue({
      value: this.value,
      onValueChange: (next: string) => {
        this.value = next;
        this.dispatchEvent(new CustomEvent('value-change', { detail: { value: next }, bubbles: true }));
      },
    });
  }
}
