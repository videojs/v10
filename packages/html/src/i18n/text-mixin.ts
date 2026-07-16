import { type Text, translateText } from '@videojs/core/i18n';
import type { PropertyValues, ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';
import type { I18nContext } from './context';
import { I18nController } from './controller';
import type { ReactiveElementMixinBase } from './types';

export type I18nTextMixin = <Base extends ReactiveElementMixinBase>(Base: Base) => Constructor<ReactiveElement> & Base;

export interface TextMixinConfig {
  context: I18nContext;
}

export function createTextMixin({ context }: TextMixinConfig): I18nTextMixin {
  return (Base) => {
    class MediaText extends Base {
      static override properties = {
        token: { type: String },
      };

      readonly #i18n = new I18nController(this, context);
      #text: string | undefined;
      token = '';

      override connectedCallback(): void {
        this.#text ??= this.textContent?.trim() ?? '';
        super.connectedCallback();
      }

      protected override updated(changed: PropertyValues): void {
        super.updated(changed);
        if (!this.#text) {
          this.textContent = '';
          return;
        }

        const text: Text | string = this.token ? { key: this.token, text: this.#text } : this.#text;
        this.textContent = typeof text === 'string' ? text : translateText(text, this.#i18n.value);
      }
    }

    return MediaText;
  };
}
