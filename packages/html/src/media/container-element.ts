import { applyContainerAttrs, focusContainer } from '@videojs/core/dom';
import { labelText } from '@videojs/core/i18n/text/container';
import type { PropertyValues } from '@videojs/element';
import { listen } from '@videojs/utils/dom';

import { i18nContext } from '../i18n/context';
import { I18nController } from '../i18n/controller';
import { containerContext, playerContext } from '../player/context';
import { createContainerMixin } from '../store/container-mixin';
import { MediaElement } from '../ui/media-element';

const ContainerMixin = createContainerMixin({ playerContext, containerContext });

export class MediaContainerElement extends ContainerMixin(MediaElement) {
  static readonly tagName = 'media-container';

  readonly #i18n = new I18nController(this, i18nContext);
  #disconnect: AbortController | null = null;
  #label: string | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    applyContainerAttrs(this);
    this.#applyLabel();

    this.#disconnect = new AbortController();
    listen(this, 'pointerup', this.#onPointerUp, { signal: this.#disconnect.signal });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);
    this.#applyLabel();
  }

  #applyLabel(): void {
    const current = this.getAttribute('aria-label');
    if (current && current !== this.#label) return;

    if (this.hasAttribute('aria-labelledby')) {
      if (current === this.#label) {
        this.removeAttribute('aria-label');
        this.#label = null;
      }
      return;
    }

    const label = this.#i18n.value(labelText);
    this.setAttribute('aria-label', label);
    this.#label = label;
  }

  #onPointerUp = (): void => {
    focusContainer(this);
  };
}
