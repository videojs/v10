import type { AddLocaleRoot, I18nContextValue } from './context';
import type { I18nProviderProps } from './create-i18n';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function mergeTranslations(
  parent: I18nProviderProps['translations'],
  child: I18nProviderProps['translations']
): I18nProviderProps['translations'] {
  return {
    ...parent,
    ...child,
    ...(parent && child
      ? Object.fromEntries(
          Object.keys(parent)
            .filter((key) => isRecord(parent[key]) && isRecord(child[key]))
            .map((key) => {
              const parentValue = parent[key];
              const childValue = child[key];
              return [
                key,
                isRecord(parentValue) && isRecord(childValue) ? { ...parentValue, ...childValue } : childValue,
              ];
            })
        )
      : {}),
  } as I18nProviderProps['translations'];
}

export interface I18nProviderRootProps extends I18nProviderProps {
  parentLocale?: I18nContextValue['locale'];
  localeFromProp?: boolean;
  parentAddLocaleRoot?: AddLocaleRoot;
}

export function getProviderRootProps(
  props: I18nProviderProps,
  parent: I18nContextValue | null,
  parentAddLocaleRoot?: AddLocaleRoot
): I18nProviderRootProps | undefined {
  const hasOverrides =
    props.locale !== undefined || props.translations !== undefined || props.onActiveLocaleChange !== undefined;
  const langRootOnly = props.langRootRef !== undefined && !hasOverrides;

  // Nested providers without their own locale root or overrides can use the
  // existing parent context instead of mounting another root.
  if (parent && !hasOverrides && (!langRootOnly || parent.localeFromProp)) {
    return undefined;
  }

  const inheritedLocale = props.locale ?? (props.langRootRef === undefined ? parent?.locale : undefined);
  const parentLocale = props.langRootRef !== undefined ? parent?.locale : undefined;
  const inheritedTranslations =
    props.translations !== undefined && parent?.translations !== undefined
      ? mergeTranslations(parent.translations, props.translations)
      : (props.translations ?? (langRootOnly ? parent?.translations : undefined));
  const onActiveLocaleChange = props.onActiveLocaleChange ?? parent?.onActiveLocaleChange;

  return {
    ...props,
    ...(inheritedLocale !== undefined ? { locale: inheritedLocale } : {}),
    localeFromProp: props.locale !== undefined,
    ...(parentLocale !== undefined ? { parentLocale } : {}),
    ...(inheritedTranslations !== undefined ? { translations: inheritedTranslations } : {}),
    ...(onActiveLocaleChange !== undefined ? { onActiveLocaleChange } : {}),
    ...(parentAddLocaleRoot !== undefined ? { parentAddLocaleRoot } : {}),
  };
}
