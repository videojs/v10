import { applyElementProps } from '@videojs/core/dom';
import { resolveTranslation } from '@videojs/core/i18n';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { MediaElement } from '../media-element';
import { menuContext } from './context';

export class MenuBackElement extends MediaElement {
  static readonly tagName = 'media-menu-back';

  static override properties = {
    label: { type: String },
  } satisfies PropertyDeclarationMap<'label'>;

  label = 'Back';

  readonly #i18n = new I18nController(this, i18nContext);
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
      'aria-label': resolveTranslation(this.#i18n.value, this.label),
    });
  }
}
