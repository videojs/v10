import { applyElementProps, applyStateDataAttrs } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuBackElement extends MediaElement {
  static readonly tagName = 'media-menu-back';

  static override properties = {
    label: { type: String },
  } satisfies PropertyDeclarationMap<'label'>;

  label = 'Back';

  readonly #ctx = new ContextConsumer(this, { context: menuContext, subscribe: true });

  #disconnect: AbortController | null = null;
  #bound = false;

  override connectedCallback(): void {
    super.connectedCallback();
    this.#disconnect = new AbortController();
    this.#bound = false;
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#bound = false;
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#ctx.value;
    if (!ctx || !this.#disconnect) return;

    if (!this.#bound) {
      this.#bound = true;

      applyElementProps(
        this,
        {
          onClick: () => {
            // Pop to the parent menu view.
            ctx.parentMenu?.pop();
          },
        },
        { signal: this.#disconnect.signal }
      );
    }

    applyElementProps(this, {
      role: 'button',
      'aria-label': this.label,
    });

    if (ctx) applyStateDataAttrs(this, ctx.state, ctx.stateAttrMap);
  }
}
