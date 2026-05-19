import {
  createTranslator,
  getI18nTranslations,
  type Locale,
  localeLookupChain,
  onI18nRegistryChange,
  type Translations,
  type Translator,
} from '@videojs/core/i18n';
import type { PropertyValues, ReactiveController, ReactiveControllerHost, ReactiveElement } from '@videojs/element';
import { type Context, ContextConsumer, ContextProvider, createContext } from '@videojs/element/context';
import { mergeLocaleOverlays, subscribeAmbientLang } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';

import { playerContext } from '../player/context';
import { resolveProviderLocale } from './locale';
import { selectCaptionsByLocale } from './select-captions-by-locale';

async function noopBuiltinPack(_tag: string): Promise<Partial<Translations> | undefined> {
  return undefined;
}

/** Reflected i18n keys are untyped strings; the runtime translator accepts any key. */
function translateReflectedKey(translator: Translator, key: string): string {
  const translateLoose = translator as (k: string, params?: unknown) => string;
  return translateLoose(key);
}

export interface I18nContextValue {
  translator: Translator;
  locale: Locale;
}

export interface CreateI18nOptions {
  loadBuiltinLocale?: (tag: string) => Promise<Partial<Translations> | undefined>;
}

/** Per-factory context identity (see {@link createI18n}). */
export type I18nLitContext = Context<symbol, I18nContextValue>;

/**
 * `Constructor<ReactiveElement>` does not imply static `properties`; this intersection matches how
 * mixins spread {@link ReactiveElement.properties} from their base.
 */
type ReactiveElementMixinBase = Constructor<ReactiveElement> & Pick<typeof ReactiveElement, 'properties'>;

export interface CreateI18nResult {
  context: I18nLitContext;
  I18nController: new (
    host: ReactiveControllerHost & HTMLElement
  ) => ReactiveController & {
    readonly value: Translator;
    readonly locale: Locale;
  };
  ProviderMixin: <Base extends ReactiveElementMixinBase>(Base: Base) => Constructor<ReactiveElement> & Base;
  TextMixin: <Base extends ReactiveElementMixinBase>(Base: Base) => Constructor<ReactiveElement> & Base;
}

export function createI18n(options?: CreateI18nOptions): CreateI18nResult {
  const loadBuiltin = options?.loadBuiltinLocale ?? noopBuiltinPack;
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

  const ProviderMixin = <Base extends ReactiveElementMixinBase>(Base: Base) => {
    class I18nProviderElement extends Base {
      static properties = {
        ...Base.properties,
        lang: { type: String, reflect: true },
      };

      lang = '';

      readonly #i18nProvider = new ContextProvider(this, {
        context: i18nContext,
        initialValue: {
          translator: fallbackTranslator,
          locale: 'en',
        },
      });

      #registryUnsub: (() => void) | undefined;
      #ambientUnsub: (() => void) | undefined;
      #lazyLayer: Partial<Translations> = {};
      #lazySeq = 0;
      /** Tracks locale used for `#lazyLayer`; ambient `lang` can change without the `lang` property. */
      #resolvedLocaleForLazy: Locale | undefined;
      /** Locale snapshot when the current `#lazySeq` async load was started (see `willUpdate` drift guard). */
      #lazyResetStartedForLocale: Locale | undefined;

      readonly #storeConsumer = new ContextConsumer(this, {
        context: playerContext,
        callback: () => this.#syncCaptions(),
        subscribe: true,
      });

      override connectedCallback(): void {
        super.connectedCallback();
        this.#registryUnsub = onI18nRegistryChange(() => this.requestUpdate());
        this.#ambientUnsub = subscribeAmbientLang(() => this.requestUpdate());
        this.#resetLazyAndLoad();
        this.requestUpdate();
      }

      override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#registryUnsub?.();
        this.#registryUnsub = undefined;
        this.#ambientUnsub?.();
        this.#ambientUnsub = undefined;
        this.#lazySeq += 1;
        this.#lazyLayer = {};
        this.#resolvedLocaleForLazy = undefined;
        this.#lazyResetStartedForLocale = undefined;
      }

      protected override willUpdate(changed: PropertyValues): void {
        super.willUpdate(changed);
        const locale = resolveProviderLocale(this);
        if (this.#resolvedLocaleForLazy !== locale) {
          const hadLocale = this.#resolvedLocaleForLazy !== undefined;
          this.#resolvedLocaleForLazy = locale;
          const localeDriftedBeforeFirstPaint =
            !hadLocale && this.#lazyResetStartedForLocale !== undefined && locale !== this.#lazyResetStartedForLocale;
          if ((hadLocale && this.hasUpdated) || localeDriftedBeforeFirstPaint) {
            this.#resetLazyAndLoad();
          }
        }
      }

      protected override updated(changed: PropertyValues): void {
        super.updated(changed);
        this.#publish();
        this.#syncCaptions();
      }

      #resetLazyAndLoad(): void {
        const localeSnapshot = resolveProviderLocale(this);
        this.#lazyResetStartedForLocale = localeSnapshot;
        this.#lazySeq += 1;
        const seq = this.#lazySeq;
        this.#lazyLayer = {};
        void (async () => {
          const merged = await mergeLocaleOverlays(localeSnapshot, loadBuiltin, localeLookupChain);
          if (seq !== this.#lazySeq) return;
          this.#lazyLayer = merged;
          this.requestUpdate();
        })();
      }

      #resolvedLocale(): Locale {
        return resolveProviderLocale(this);
      }

      #publish(): void {
        const locale = this.#resolvedLocale();
        const registryLayer = getI18nTranslations(locale);
        const translations: Translations = {
          ...registryLayer,
          ...this.#lazyLayer,
        };
        const translator = createTranslator(translations, locale);
        this.#i18nProvider.setValue({ translator, locale });
      }

      #syncCaptions(): void {
        selectCaptionsByLocale(this.#storeConsumer.value ?? undefined, this.#resolvedLocale());
      }
    }
    return I18nProviderElement;
  };

  const TextMixin = <Base extends ReactiveElementMixinBase>(Base: Base) => {
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
    I18nController: I18nControllerImpl,
    ProviderMixin,
    TextMixin,
  };
}
