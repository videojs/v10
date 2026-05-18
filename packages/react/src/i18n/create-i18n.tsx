'use client';

import {
  createTranslator,
  getI18nTranslations,
  type Locale,
  localeLookupChain,
  onI18nRegistryChange,
  type Translations,
  type Translator,
} from '@videojs/core/i18n';
import { mergeLocaleOverlays, nearestLang, subscribeAmbientLang } from '@videojs/utils/dom';
import { isUndefined } from '@videojs/utils/predicate';
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

/** Built-ins omit English; defaults already live in the core registry via {@link getI18nTranslations}. */
async function noopBuiltinPack(tag: string): Promise<Partial<Translations> | undefined> {
  void tag;
  return undefined;
}

function ambientLangServerSnapshot(): Locale | undefined {
  return undefined;
}

/** DOM `lang` values are untyped strings; align with core {@link Locale} at the boundary. */
function localeFromDomLang(raw: string | undefined): Locale | undefined {
  if (isUndefined(raw) || raw.trim() === '') {
    return undefined;
  }
  return raw as Locale;
}

/** Matches `effectiveLocale` from `@videojs/utils/dom`; duplicated here so the result types as `Locale` without a cast. */
function resolvePlayerLocale(explicit: Locale | undefined, inherited: Locale | undefined): Locale {
  if (!isUndefined(explicit) && String(explicit).trim() !== '') {
    return explicit;
  }
  if (!isUndefined(inherited) && inherited.trim() !== '') {
    return inherited;
  }
  return 'en';
}

export interface CreateI18nOptions {
  /** Override built-in locale loading (tests or custom packs). */
  loadBuiltinLocale?: (tag: string) => Promise<Partial<Translations> | undefined>;
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
  const loadBuiltin = options?.loadBuiltinLocale ?? noopBuiltinPack;

  const I18nContext = createContext<I18nContextValue | null>(null);

  function I18nProvider({
    locale: localeProp,
    langRootRef,
    translations: translationsProp,
    children,
    onActiveLocaleChange,
  }: I18nProviderProps): ReactNode {
    const [, invalidateLangRoot] = useReducer((epoch: number) => epoch + 1, 0);

    useLayoutEffect(() => {
      if (langRootRef) {
        invalidateLangRoot();
      }
    }, [langRootRef]);

    const ambientLang = useSyncExternalStore(
      subscribeAmbientLang,
      () => {
        const langRoot = langRootRef?.current ?? (typeof document !== 'undefined' ? document.documentElement : null);
        return localeFromDomLang(nearestLang(langRoot));
      },
      ambientLangServerSnapshot
    );

    const resolvedLocale = useMemo(() => resolvePlayerLocale(localeProp, ambientLang), [localeProp, ambientLang]);

    useEffect(() => {
      onActiveLocaleChange?.(resolvedLocale);
    }, [resolvedLocale, onActiveLocaleChange]);

    const [registryEpoch, invalidateRegistry] = useReducer((epoch: number) => epoch + 1, 0);
    useEffect(() => onI18nRegistryChange(() => invalidateRegistry()), []);

    const [lazyLayer, setLazyLayer] = useState<Partial<Translations>>({});

    // biome-ignore lint/correctness/useExhaustiveDependencies: rerun when `resolvedLocale` changes even though the reset callback does not reference it.
    useLayoutEffect(() => {
      setLazyLayer({});
    }, [resolvedLocale]);

    useEffect(() => {
      let cancelled = false;
      void (async () => {
        const mergedLazy = await mergeLocaleOverlays(resolvedLocale, loadBuiltin, localeLookupChain);
        if (!cancelled) {
          setLazyLayer(mergedLazy);
        }
      })();
      return () => {
        cancelled = true;
      };
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
    const fallbackRef = useRef<Translator | undefined>(undefined);
    if (!fallbackRef.current) {
      fallbackRef.current = createTranslator(getI18nTranslations('en'), 'en');
    }
    if (!ctx) {
      return fallbackRef.current;
    }
    return ctx.translator;
  }

  function useLocale(): Locale {
    const ctx = useContext(I18nContext);
    return ctx?.locale ?? 'en';
  }

  return { I18nContext, I18nProvider, useTranslator, useLocale };
}
