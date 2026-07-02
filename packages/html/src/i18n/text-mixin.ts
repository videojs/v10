import type { Translator } from '@videojs/core/i18n';
import type { PropertyValues, ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';
import type { I18nContext } from './context';
import { I18nController } from './controller';
import type { ReactiveElementMixinBase } from './types';

export type I18nTextMixin = <Base extends ReactiveElementMixinBase>(Base: Base) => Constructor<ReactiveElement> & Base;

export interface TextMixinConfig {
  i18nContext: I18nContext;
}

/** Reflected i18n keys are untyped strings; the runtime translator accepts any key. */
function translateReflectedKey(translator: Translator, key: string): string {
  // Omit the required params
  const translateLoose = translator as (k: string) => string;
  return translateLoose(key);
}

function hasAuthoredContent(host: HTMLElement): boolean {
  return Array.from(host.childNodes).some((node) => !!node.textContent?.trim());
}

export function createTextMixin({ i18nContext }: TextMixinConfig): I18nTextMixin {
  return (Base) => {
    class MediaText extends Base {
      static properties = {
        ...Base.properties,
        key: { type: String, reflect: true },
      };

      key = '';

      readonly #i18n = new I18nController(this, i18nContext);
      #text: string | undefined;
      #hasAuthoredContent = false;

      override connectedCallback(): void {
        this.#hasAuthoredContent ||= hasAuthoredContent(this);
        this.#text ??= this.textContent ?? '';
        super.connectedCallback();
      }

      protected override updated(changed: PropertyValues): void {
        super.updated(changed);
        if (this.#hasAuthoredContent) return;
        this.textContent = this.key ? translateReflectedKey(this.#i18n.value, this.key) : (this.#text ?? '');
      }
    }

    return MediaText;
  };
}
