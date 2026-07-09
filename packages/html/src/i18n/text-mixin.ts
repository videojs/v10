import type { Translator } from '@videojs/core/i18n';
import type { PropertyValues, ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';
import type { I18nContext } from './context';
import { I18nController } from './controller';
import type { ReactiveElementMixinBase } from './types';

export type I18nTextMixin = <Base extends ReactiveElementMixinBase>(Base: Base) => Constructor<ReactiveElement> & Base;

export interface TextMixinConfig {
  context: I18nContext;
}

/** Authored phrase text is untyped; the runtime translator accepts any key. */
function translateText(translator: Translator, key: string): string {
  // Omit the required params
  const translateLoose = translator as (k: string) => string;
  return translateLoose(key);
}

export function createTextMixin({ context }: TextMixinConfig): I18nTextMixin {
  return (Base) => {
    class MediaText extends Base {
      readonly #i18n = new I18nController(this, context);
      #text: string | undefined;

      override connectedCallback(): void {
        this.#text ??= this.textContent?.trim() ?? '';
        super.connectedCallback();
      }

      protected override updated(changed: PropertyValues): void {
        super.updated(changed);
        this.textContent = this.#text ? translateText(this.#i18n.value, this.#text) : '';
      }
    }

    return MediaText;
  };
}
