'use client';

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
import {
  effectiveLocale,
  mergeLocaleOverlays,
  nearestLang,
  resolveLangAttr,
  subscribeAmbientLang,
} from '@videojs/utils/dom';
import {
  type Context,
  createContext,
  type ReactNode,
  type RefObject,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { I18nContext, type I18nContextValue, useLocale, useTranslator } from './context';

function ambientLangServerSnapshot(): string | undefined {
  return undefined;
}

export interface CreateI18nOptions {
  /** Override lazy loading of shipped locale packs (tests or custom loaders). */
  loader?: (tag: string) => Promise<Partial<Translations> | undefined>;
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
   * packs for {@link locale}. Use the current English phrases returned by core controls, such as
   * `Play`, `Pause`, and `Replay`. Applies to translated
   * `aria-label` values and tooltip copy for skin controls wired through `useTranslator`.
   *
   * @example
   * ```tsx
   * <I18nProvider locale="ja" translations={{ Play: '再生', Pause: '一時停止' }}>
   *   <VideoSkin />
   * </I18nProvider>
   * ```
   */
  translations?: Partial<Translations>;
  children: ReactNode;
  /** Fires when the resolved locale changes (caption selection hooks may use this later). */
  onActiveLocaleChange?: (locale: Locale) => void;
}

export type { I18nContextValue } from './context';

type AddLocaleRoot = () => () => void;
type I18nProviderComponent = (props: I18nProviderProps) => ReactNode;

interface I18nProviderRootProps extends I18nProviderProps {
  parentLocale?: Locale;
  localeFromProp?: boolean;
  parentAddLocaleRoot?: AddLocaleRoot;
}

const I18nProviderContext = createContext<I18nProviderComponent | undefined>(undefined);

export function useOptionalI18nProvider(): I18nProviderComponent | undefined {
  return useContext(I18nProviderContext);
}

export interface CreateI18nResult {
  I18nContext: Context<I18nContextValue | null>;
  I18nProvider: (props: I18nProviderProps) => ReactNode;
  useTranslator: typeof useTranslator;
  useLocale: typeof useLocale;
}

/**
 * Creates an i18n provider and hooks for the shared React i18n context.
 *
 * @param options - Optional hooks such as custom built-in locale loading.
 * @public
 */
export function createI18n(options?: CreateI18nOptions): CreateI18nResult {
  const loader = options?.loader ?? defaultLoader;
  const LocaleRootContext = createContext<AddLocaleRoot | undefined>(undefined);

  function I18nProviderRoot({
    locale: localeProp,
    langRootRef,
    parentLocale,
    localeFromProp = localeProp !== undefined,
    translations: translationsProp,
    children,
    onActiveLocaleChange,
    parentAddLocaleRoot,
  }: I18nProviderRootProps): ReactNode {
    const onActiveLocaleChangeRef = useRef(onActiveLocaleChange);
    onActiveLocaleChangeRef.current = onActiveLocaleChange;
    const childLocaleRootCountRef = useRef(0);
    const [localeRootEpoch, invalidateLocaleRoots] = useReducer((epoch: number) => epoch + 1, 0);
    const addLocaleRoot = useCallback(() => {
      childLocaleRootCountRef.current += 1;
      return () => {
        childLocaleRootCountRef.current = Math.max(0, childLocaleRootCountRef.current - 1);
        if (childLocaleRootCountRef.current === 0) {
          invalidateLocaleRoots();
        }
      };
    }, []);
    const [, invalidateLangRoot] = useReducer((epoch: number) => epoch + 1, 0);
    const langRootElementRef = useRef<Element | null>(null);

    useLayoutEffect(() => {
      if (!langRootRef) return;
      return parentAddLocaleRoot?.();
    }, [langRootRef, parentAddLocaleRoot]);

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
          if (!root) return undefined;
          return resolveLangAttr<Locale>(nearestLang(root));
        }
        const root = typeof document !== 'undefined' ? document.documentElement : null;
        return resolveLangAttr<Locale>(nearestLang(root));
      },
      ambientLangServerSnapshot
    );

    const resolvedLocale = useMemo(
      () => effectiveLocale<Locale>(localeProp, ambientLang ?? parentLocale),
      [localeProp, ambientLang, parentLocale]
    );

    // biome-ignore lint/correctness/useExhaustiveDependencies: rerun when nested locale roots unmount even though notification reads refs.
    useEffect(() => {
      const id = setTimeout(() => {
        if (childLocaleRootCountRef.current > 0) return;
        onActiveLocaleChangeRef.current?.(resolvedLocale);
      }, 0);
      return () => clearTimeout(id);
    }, [resolvedLocale, localeRootEpoch]);

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
          const { merged, loadedTags } = await mergeLocaleOverlays(locale, loader, findLocaleKeys);
          if (seq !== lazySeqRef.current) return;
          if (shouldAttemptBrowserTranslation(locale, loadedTags, merged)) {
            const browser = await getBrowserTranslations(locale);
            if (seq !== lazySeqRef.current) return;
            if (Object.keys(browser).length) registerI18n(locale, browser);
          }
          if (seq !== lazySeqRef.current) return;
          setLazyLayer(merged);
        } catch {
          // Ignore rejected built-in locale loads; registry/prop layers still apply.
        }
      })();
      return () => {
        if (lazySeqRef.current === seq) {
          lazySeqRef.current += 1;
        }
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
      () => ({
        translator,
        locale: resolvedLocale,
        localeFromProp,
        ...(translationsProp !== undefined ? { translations: translationsProp } : {}),
        ...(onActiveLocaleChange !== undefined ? { onActiveLocaleChange } : {}),
      }),
      [translator, resolvedLocale, localeFromProp, translationsProp, onActiveLocaleChange]
    );

    return (
      <I18nProviderContext.Provider value={I18nProvider}>
        <LocaleRootContext.Provider value={addLocaleRoot}>
          <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
        </LocaleRootContext.Provider>
      </I18nProviderContext.Provider>
    );
  }

  function I18nProvider(props: I18nProviderProps): ReactNode {
    const parent = useContext(I18nContext);
    const parentAddLocaleRoot = useContext(LocaleRootContext);
    const hasOverrides =
      props.locale !== undefined || props.translations !== undefined || props.onActiveLocaleChange !== undefined;
    const langRootOnly = props.langRootRef !== undefined && !hasOverrides;
    if (parent && !hasOverrides && (!langRootOnly || parent.localeFromProp)) {
      return props.children;
    }
    const inheritedLocale = props.locale ?? (props.langRootRef === undefined && parent ? parent.locale : undefined);
    const parentLocale = props.langRootRef !== undefined && parent ? parent.locale : undefined;
    const inheritedTranslations = props.translations ?? (langRootOnly && parent ? parent.translations : undefined);
    const onActiveLocaleChange = props.onActiveLocaleChange ?? parent?.onActiveLocaleChange;
    const rootProps: I18nProviderRootProps = { ...props };
    if (inheritedLocale !== undefined) rootProps.locale = inheritedLocale;
    rootProps.localeFromProp = props.locale !== undefined;
    if (parentLocale !== undefined) rootProps.parentLocale = parentLocale;
    if (inheritedTranslations !== undefined) rootProps.translations = inheritedTranslations;
    if (onActiveLocaleChange !== undefined) rootProps.onActiveLocaleChange = onActiveLocaleChange;
    if (parentAddLocaleRoot !== undefined) rootProps.parentAddLocaleRoot = parentAddLocaleRoot;
    return <I18nProviderRoot {...rootProps} />;
  }

  return { I18nContext, I18nProvider, useTranslator, useLocale };
}

const defaultI18n = createI18n();

/**
 * Resolves locale and supplies a typed translator to descendants. Mount this explicitly for
 * translated controls, forced locales, SSR copy, or locale-aware player roots.
 *
 * @public
 */
export const I18nProvider = defaultI18n.I18nProvider;
