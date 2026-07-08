import {
  createTranslator,
  loadLocale as defaultLoader,
  findLocaleKeys,
  getBrowserTranslations,
  getI18nTranslations,
  type Locale,
  onI18nRegistryChange,
  registerI18n,
  shouldAttemptBrowserTranslation,
  type Translations,
} from '@videojs/core/i18n';
import type { PropertyValues, ReactiveElement } from '@videojs/element';
import { ContextProvider } from '@videojs/element/context';
import { mergeLocaleOverlays, subscribeAmbientLang } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';

import type { I18nContext, I18nContextValue } from './context';
import { getFallbackTranslator } from './controller';
import { resolveProviderLocale } from './locale';
import type { LocaleLoader, ReactiveElementMixinBase } from './types';

const DEFAULT_LOCALE = 'en';

export interface I18nProviderConfig {
  context: I18nContext;
  /** Override lazy loading of shipped locale packs (tests or custom loaders). */
  loader?: LocaleLoader | undefined;
}

export type I18nProviderMixin = <Base extends ReactiveElementMixinBase>(
  Base: Base
) => Constructor<ReactiveElement> & Base;

export function createI18nProviderMixin({ context, loader = defaultLoader }: I18nProviderConfig): I18nProviderMixin {
  return <Base extends ReactiveElementMixinBase>(Base: Base) => {
    class I18nProviderElement extends Base {
      static properties = {
        ...Base.properties,
        lang: { type: String, reflect: true },
      };

      lang = '';

      readonly #i18nProvider = new ContextProvider(this, {
        context,
        initialValue: {
          translator: getFallbackTranslator(),
          locale: DEFAULT_LOCALE,
        },
      });

      #registryUnsubscribe: (() => void) | undefined;
      #ambientUnsubscribe: (() => void) | undefined;
      #registryEpoch = 0;
      #lazyLayer: Partial<Translations> = {};
      #lazySeq = 0;
      /** Tracks locale used for `#lazyLayer`; ambient `lang` can change without the `lang` property. */
      #resolvedLocaleForLazy: Locale | undefined;
      /** Locale snapshot when the current `#lazySeq` async load was started (see `willUpdate` drift guard). */
      #lazyResetStartedForLocale: Locale | undefined;
      #i18nValue: I18nContextValue = {
        translator: getFallbackTranslator(),
        locale: DEFAULT_LOCALE,
      };
      #publishedLocale: Locale | undefined;
      #publishedRegistryEpoch = -1;
      #publishedLazyLayer: Partial<Translations> | undefined;

      protected get i18nValue(): I18nContextValue {
        return this.#i18nValue;
      }

      override connectedCallback(): void {
        super.connectedCallback();
        this.#registryUnsubscribe = onI18nRegistryChange(() => {
          this.#registryEpoch += 1;
          this.requestUpdate();
        });
        this.#ambientUnsubscribe = subscribeAmbientLang(() => this.requestUpdate());
        this.#resetLazyAndLoad();
        this.#publish();
        this.requestUpdate();
      }

      override disconnectedCallback(): void {
        super.disconnectedCallback();
        this.#registryUnsubscribe?.();
        this.#registryUnsubscribe = undefined;
        this.#ambientUnsubscribe?.();
        this.#ambientUnsubscribe = undefined;
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
        this.#publish();
      }

      #resetLazyAndLoad(): void {
        const localeSnapshot = resolveProviderLocale(this);
        this.#lazyResetStartedForLocale = localeSnapshot;
        this.#lazySeq += 1;
        const seq = this.#lazySeq;
        this.#lazyLayer = {};
        void (async () => {
          const { merged, loadedTags } = await mergeLocaleOverlays(localeSnapshot, loader, findLocaleKeys);
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
        if (
          this.#publishedLocale === locale &&
          this.#publishedRegistryEpoch === this.#registryEpoch &&
          this.#publishedLazyLayer === this.#lazyLayer
        ) {
          return;
        }
        const registryLayer = getI18nTranslations(locale);
        const translations: Translations = {
          ...registryLayer,
          ...this.#lazyLayer,
        };
        const translator = createTranslator(translations, locale);
        this.#i18nValue = { translator, locale };
        this.#publishedLocale = locale;
        this.#publishedRegistryEpoch = this.#registryEpoch;
        this.#publishedLazyLayer = this.#lazyLayer;
        this.#i18nProvider.setValue(this.#i18nValue);
      }
    }
    return I18nProviderElement;
  };
}
