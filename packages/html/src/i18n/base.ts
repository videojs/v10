import { createTranslator, getI18nTranslations, type Locale, type Translator } from '@videojs/core/i18n';
import type { PropertyValues, ReactiveController, ReactiveControllerHost, ReactiveElement } from '@videojs/element';
import { type Context, ContextConsumer, createContext } from '@videojs/element/context';
import type { Constructor } from '@videojs/utils/types';

/** Reflected i18n keys are untyped strings; the runtime translator accepts any key. */
function translateReflectedKey(translator: Translator, key: string): string {
  const translateLoose = translator as (k: string, params?: unknown) => string;
  return translateLoose(key);
}

export interface I18nContextValue {
  translator: Translator;
  locale: Locale;
}

/** Per-factory context identity (see {@link createI18n}). */
export type I18nLitContext = Context<symbol, I18nContextValue>;

/**
 * `Constructor<ReactiveElement>` does not imply static `properties`; this intersection matches how
 * mixins spread {@link ReactiveElement.properties} from their base.
 */
export type ReactiveElementMixinBase = Constructor<ReactiveElement> & Pick<typeof ReactiveElement, 'properties'>;

export type I18nControllerConstructor = new (
  host: ReactiveControllerHost & HTMLElement
) => ReactiveController & {
  readonly value: Translator;
  readonly locale: Locale;
};

export type I18nTextMixin = <Base extends ReactiveElementMixinBase>(
  Base: Base
) => Constructor<ReactiveElement> & Base;

export interface I18nBase {
  context: I18nLitContext;
  fallbackTranslator: Translator;
  I18nController: I18nControllerConstructor;
  TextMixin: I18nTextMixin;
}

export function createI18nBase(): I18nBase {
  const fallbackTranslator = createTranslator(getI18nTranslations('en'), 'en');
  const i18nContextKey = Symbol('@videojs/i18n');
  const i18nContext = createContext<I18nContextValue, typeof i18nContextKey>(i18nContextKey);

  class I18nControllerImpl implements ReactiveController {
    readonly #host: ReactiveControllerHost & HTMLElement;
    readonly #consumer: ContextConsumer<I18nLitContext, ReactiveControllerHost & HTMLElement>;

    constructor(host: ReactiveControllerHost & HTMLElement) {
      this.#host = host;
      this.#consumer = new ContextConsumer(host, {
        context: i18nContext,
        callback: () => this.#host.requestUpdate(),
        subscribe: true,
      });
      host.addController(this);
    }

    get value(): Translator {
      return this.#consumer.value?.translator ?? fallbackTranslator;
    }

    get locale(): Locale {
      return this.#consumer.value?.locale ?? 'en';
    }

    hostConnected(): void {}

    hostDisconnected(): void {}
  }

  const TextMixin: I18nTextMixin = (Base) => {
    class MediaText extends Base {
      static properties = {
        ...Base.properties,
        key: { type: String, reflect: true },
      };

      key = '';

      readonly #i18n = new I18nControllerImpl(this);

      protected override updated(changed: PropertyValues): void {
        super.updated(changed);
        this.textContent = this.key ? translateReflectedKey(this.#i18n.value, this.key) : '';
      }
    }
    return MediaText;
  };

  return {
    context: i18nContext,
    fallbackTranslator,
    I18nController: I18nControllerImpl,
    TextMixin,
  };
}
