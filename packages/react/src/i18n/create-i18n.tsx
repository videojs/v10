'use client';

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
  type Translator,
} from '@videojs/core/i18n';
import {
  effectiveLocale,
  localeFromDomLang,
  mergeLocaleOverlays,
  nearestLang,
  subscribeAmbientLang,
} from '@videojs/utils/dom';
import {
  type Context,
  createContext,
  type ReactNode,
  type RefObject,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

function ambientLangServerSnapshot(): string | undefined {
  return undefined;
}

export interface CreateI18nOptions {
  /** Override lazy loading of shipped locale packs (tests or custom loaders). */
  loadLocale?: (tag: string) => Promise<Partial<Translations> | undefined>;
}

export interface I18nProviderProps {
  /**
   * Forces the active locale. Omit to inherit the nearest non-empty `lang` by walking DOM
   * ancestors from {@link langRootRef} when set, otherwise from `document.documentElement`
   * (typically `<html lang>`). Updates when any `lang` attribute changes anywhere under `<html>`,
   * or when subtree moves alter which ancestor supplies `lang`. For SSR, pass `locale` explicitly.
   */
  locale?: Locale;
  /**
   * Element whose ancestor chain is searched for a non-empty `lang` when {@link locale} is
   * omitted—for example a ref to your player shell `HTMLElement`.
   */
  langRootRef?: RefObject<Element | null>;
  /**
   * Per-locale string overrides merged on top of the global registry and any lazy built-in
   * packs for {@link locale}. Use registry keys such as `play`, `pause`, and `replay`—the same
   * keys returned by core control `getLabel`—not visible button text. Applies to translated
   * `aria-label` values and tooltip copy for skin controls wired through `useTranslator`.
   *
   * @example
   * ```tsx
   * <I18nProvider locale="ja" translations={{ play: '再生', pause: '一時停止' }}>
   *   <VideoSkin />
   * </I18nProvider>
   * ```
   */
  translations?: Partial<Translations>;
  children: ReactNode;
  /** Fires when the resolved locale changes (caption selection hooks may use this later). */
  onActiveLocaleChange?: (locale: Locale) => void;
}

export interface I18nContextValue {
  translator: Translator;
  locale: Locale;
}

export interface CreateI18nResult {
  I18nContext: Context<I18nContextValue | null>;
  I18nProvider: (props: I18nProviderProps) => ReactNode;
  useTranslator: () => Translator;
  useLocale: () => Locale;
}

/**
 * Creates an isolated i18n context stack (`I18nProvider`, hooks) mirroring {@link createPlayer}.
 *
 * @param options - Optional hooks such as custom built-in locale loading.
 */
export function createI18n(options?: CreateI18nOptions): CreateI18nResult {
  const loadLocale = options?.loadLocale ?? defaultLoadLocale;

  const I18nContext = createContext<I18nContextValue | null>(null);

  function I18nProvider({
    locale: localeProp,
    langRootRef,
    translations: translationsProp,
    children,
    onActiveLocaleChange,
  }: I18nProviderProps): ReactNode {
    const onActiveLocaleChangeRef = useRef(onActiveLocaleChange);
    onActiveLocaleChangeRef.current = onActiveLocaleChange;
    const [, invalidateLangRoot] = useReducer((epoch: number) => epoch + 1, 0);
    const langRootElementRef = useRef<Element | null>(null);

    useLayoutEffect(() => {
      if (!langRootRef) {
        if (langRootElementRef.current !== null) {
          langRootElementRef.current = null;
          invalidateLangRoot();
        }
        return;
      }
      const node = langRootRef.current;
      if (node === langRootElementRef.current) return;
      langRootElementRef.current = node;
      invalidateLangRoot();
    });

    const ambientLang = useSyncExternalStore(
      subscribeAmbientLang,
      () => {
        if (langRootRef) {
          const root = langRootElementRef.current ?? langRootRef.current;
          return localeFromDomLang(nearestLang(root));
        }
        const root = typeof document !== 'undefined' ? document.documentElement : null;
        return localeFromDomLang(nearestLang(root));
      },
      ambientLangServerSnapshot
    );

    const resolvedLocale = useMemo(() => effectiveLocale(localeProp, ambientLang) as Locale, [localeProp, ambientLang]);

    useEffect(() => {
      onActiveLocaleChangeRef.current?.(resolvedLocale);
    }, [resolvedLocale]);

    const [registryEpoch, invalidateRegistry] = useReducer((epoch: number) => epoch + 1, 0);
    useEffect(() => {
      return onI18nRegistryChange(() => invalidateRegistry());
    }, []);

    const [lazyLayer, setLazyLayer] = useState<Partial<Translations>>({});
    const lazySeqRef = useRef(0);

    // biome-ignore lint/correctness/useExhaustiveDependencies: rerun when `resolvedLocale` changes even though the reset callback does not reference it.
    useLayoutEffect(() => {
      lazySeqRef.current += 1;
      setLazyLayer({});
    }, [resolvedLocale]);

    useEffect(() => {
      const seq = lazySeqRef.current;
      const locale = resolvedLocale;
      void (async () => {
        try {
          const mergedLazy = await mergeLocaleOverlays(locale, loadLocale, localeLookupChain);
          if (seq !== lazySeqRef.current) return;
          if (shouldAttemptBrowserTranslation(locale, mergedLazy)) {
            const browser = await getBrowserTranslations(locale);
            if (Object.keys(browser).length) registerI18n(locale, browser);
          }
          if (seq !== lazySeqRef.current) return;
          setLazyLayer(mergedLazy);
        } catch {
          // Ignore rejected built-in locale loads; registry/prop layers still apply.
        }
      })();
    }, [resolvedLocale]);

    // biome-ignore lint/correctness/useExhaustiveDependencies: `registryEpoch` bumps on registry mutations; `getI18nTranslations` reads mutable registry state.
    const translations = useMemo(() => {
      const registryLayer = getI18nTranslations(resolvedLocale);
      return {
        ...registryLayer,
        ...lazyLayer,
        ...translationsProp,
      } as Translations;
    }, [resolvedLocale, lazyLayer, translationsProp, registryEpoch]);

    const translator = useMemo(() => createTranslator(translations, resolvedLocale), [translations, resolvedLocale]);

    const value = useMemo<I18nContextValue>(
      () => ({ translator, locale: resolvedLocale }),
      [translator, resolvedLocale]
    );

    return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
  }

  function useTranslator(): Translator {
    const ctx = useContext(I18nContext);
    const [registryEpoch, invalidateRegistry] = useReducer((epoch: number) => epoch + 1, 0);

    useEffect(() => {
      return onI18nRegistryChange(() => invalidateRegistry());
    }, []);

    const fallback = useMemo(() => {
      void registryEpoch;
      return createTranslator(getI18nTranslations('en'), 'en');
    }, [registryEpoch]);

    if (!ctx) {
      return fallback;
    }
    return ctx.translator;
  }

  function useLocale(): Locale {
    const ctx = useContext(I18nContext);
    return ctx?.locale ?? 'en';
  }

  return { I18nContext, I18nProvider, useTranslator, useLocale };
}
