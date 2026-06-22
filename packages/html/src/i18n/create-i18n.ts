import {
  createTranslator,
  loadLocale as defaultLoadLocale,
  getBrowserTranslations,
  getI18nTranslations,
  type Locale,
  localeLookupChain,
  onI18nRegistryChange,
  registerI18n,
  shouldAttemptBrowserTranslation,
  type Translations,
} from '@videojs/core/i18n';
import type { PropertyValues, ReactiveElement } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { mergeLocaleOverlays, subscribeAmbientLang } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';

import {
  createI18nBase,
  type I18nBase,
  type I18nControllerConstructor,
  type I18nLitContext,
  type I18nTextMixin,
  type ReactiveElementMixinBase,
} from './base';
import { resolveProviderLocale } from './locale';

export type { I18nContextValue, I18nLitContext } from './base';

export interface CreateI18nOptions {
  /** Override lazy loading of shipped locale packs (tests or custom loaders). */
  loadLocale?: (tag: string) => Promise<Partial<Translations> | undefined>;
}

export interface CreateI18nResult {
  context: I18nLitContext;
  I18nController: I18nControllerConstructor;
  ProviderMixin: <Base extends ReactiveElementMixinBase>(Base: Base) => Constructor<ReactiveElement> & Base;
  TextMixin: I18nTextMixin;
}

export function createI18n(options?: CreateI18nOptions): CreateI18nResult {
  return createI18nWithBase(createI18nBase(), options);
}

export function createI18nWithBase(base: I18nBase, options?: CreateI18nOptions): CreateI18nResult {
  const loadLocale = options?.loadLocale ?? defaultLoadLocale;

  const ProviderMixin = <Base extends ReactiveElementMixinBase>(Base: Base) => {
    class I18nProviderElement extends Base {
      static properties = {
        ...Base.properties,
        lang: { type: String, reflect: true },
      };

      lang = '';

      readonly #i18nProvider = new ContextProvider(this, {
        context: base.context,
        initialValue: {
          translator: base.fallbackTranslator,
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
          if (hadLocale || localeDriftedBeforeFirstPaint) {
            this.#resetLazyAndLoad();
          }
        }
      }

      protected override updated(changed: PropertyValues): void {
        super.updated(changed);
        this.#publish();
      }

      #resetLazyAndLoad(): void {
        const localeSnapshot = resolveProviderLocale(this);
        this.#lazyResetStartedForLocale = localeSnapshot;
        this.#lazySeq += 1;
        const seq = this.#lazySeq;
        this.#lazyLayer = {};
        void (async () => {
          const { merged, loadedTags } = await mergeLocaleOverlays(localeSnapshot, loadLocale, localeLookupChain);
          if (seq !== this.#lazySeq) return;
          if (shouldAttemptBrowserTranslation(localeSnapshot, loadedTags, merged)) {
            const browser = await getBrowserTranslations(localeSnapshot);
            if (seq !== this.#lazySeq) return;
            if (Object.keys(browser).length) registerI18n(localeSnapshot, browser);
          }
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
    }
    return I18nProviderElement;
  };

  return {
    context: base.context,
    I18nController: base.I18nController,
    ProviderMixin,
    TextMixin: base.TextMixin,
  };
}
