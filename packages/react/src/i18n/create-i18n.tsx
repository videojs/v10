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

async function mergeBuiltinOverlays(
  locale: string,
  load: (tag: string) => Promise<Partial<Translations> | undefined>
): Promise<Partial<Translations>> {
  const chain = localeLookupChain(locale);
  const layers = await Promise.all(chain.map((tag) => load(tag)));
  const merged: Partial<Translations> = {};
  for (let i = chain.length - 1; i >= 0; i--) {
    const layer = layers[i];
    if (layer) {
      Object.assign(merged, layer);
    }
  }
  return merged;
}

/**
 * Subscribes to DOM updates that can change {@link nearestLang}: any `lang` attribute edit,
 * or subtree structural changes under `<html>` (which can move nodes between labeled ancestors).
 */
function subscribeAmbientLang(onStoreChange: () => void): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }
  let disconnected = false;
  let queued = false;
  const flush = (): void => {
    queued = false;
    if (disconnected) {
      return;
    }
    onStoreChange();
  };
  const schedule = (): void => {
    if (!queued) {
      queued = true;
      queueMicrotask(flush);
    }
  };
  const root = document.documentElement;
  const observer = new MutationObserver(schedule);
  observer.observe(root, {
    subtree: true,
    attributes: true,
    attributeFilter: ['lang'],
    childList: true,
  });
  return () => {
    disconnected = true;
    observer.disconnect();
    queued = false;
  };
}

/** First non-empty `lang` on `start` or an ancestor (HTML language inheritance). */
function nearestLang(start: Element | null): string | undefined {
  if (!start || typeof document === 'undefined') {
    return undefined;
  }
  let node: Element | null = start;
  while (node) {
    const trimmed = node.getAttribute('lang')?.trim();
    if (trimmed) {
      return trimmed;
    }
    node = node.parentElement;
  }
  return undefined;
}

function ambientLangServerSnapshot(): string | undefined {
  return undefined;
}

function effectiveLocale(localeProp: Locale | undefined, ambientLang: string | undefined): Locale {
  if (!isUndefined(localeProp) && String(localeProp).trim() !== '') {
    return localeProp;
  }
  if (!isUndefined(ambientLang) && ambientLang.trim() !== '') {
    return ambientLang;
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
    const langRootElement = langRootRef?.current ?? null;
    const onActiveLocaleChangeRef = useRef(onActiveLocaleChange);
    onActiveLocaleChangeRef.current = onActiveLocaleChange;

    useLayoutEffect(() => {
      if (langRootRef) {
        invalidateLangRoot();
      }
    }, [langRootRef, langRootElement]);

    const ambientLang = useSyncExternalStore(
      subscribeAmbientLang,
      () => {
        if (langRootRef) {
          return nearestLang(langRootRef.current);
        }
        const root = typeof document !== 'undefined' ? document.documentElement : null;
        return nearestLang(root);
      },
      ambientLangServerSnapshot
    );

    const resolvedLocale = useMemo(() => effectiveLocale(localeProp, ambientLang), [localeProp, ambientLang]);

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
        const mergedLazy = await mergeBuiltinOverlays(locale, loadBuiltin);
        if (seq !== lazySeqRef.current) return;
        setLazyLayer(mergedLazy);
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
