import type { Translations } from '@videojs/core/i18n';
import { isObject } from '@videojs/utils/predicate';

import type { AddLocaleRoot, I18nContextValue } from './context';
import type { I18nProviderProps } from './create-i18n';

function isTranslations(value: string | Translations | undefined): value is Translations {
  return isObject(value) && !Array.isArray(value);
}

function mergeTranslations(
  parent: I18nProviderProps['translations'],
  child: I18nProviderProps['translations']
): I18nProviderProps['translations'] {
  const translations: Partial<Translations> = {
    ...parent,
    ...child,
  };
  if (parent && child) {
    Object.assign(
      translations,
      Object.fromEntries(
        Object.keys(parent)
          .filter((key) => isTranslations(parent[key]) && isTranslations(child[key]))
          .map((key) => {
            const parentValue = parent[key];
            const childValue = child[key];
            return [
              key,
              isTranslations(parentValue) && isTranslations(childValue)
                ? { ...parentValue, ...childValue }
                : childValue,
            ];
          })
      )
    );
  }
  return translations;
}

export interface I18nProviderRootProps extends I18nProviderProps {
  parentLocale?: I18nContextValue['locale'];
  localeFromProp?: boolean;
  localeFromOwnProp?: boolean;
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
  if (parent && !hasOverrides && (!langRootOnly || (parent.localeFromOwnProp ?? parent.localeFromProp))) {
    return undefined;
  }

  const inheritedLocale = props.locale ?? (props.langRootRef === undefined ? parent?.locale : undefined);
  const parentLocale = props.langRootRef !== undefined ? parent?.locale : undefined;
  const inheritedTranslations =
    props.translations !== undefined && parent?.translations !== undefined
      ? mergeTranslations(parent.translations, props.translations)
      : (props.translations ?? (langRootOnly ? parent?.translations : undefined));
  const onActiveLocaleChange = props.onActiveLocaleChange ?? parent?.onActiveLocaleChange;
  const localeFromProp =
    props.locale !== undefined || (props.langRootRef === undefined && parent?.localeFromProp === true);

  const rootProps: I18nProviderRootProps = {
    ...props,
    localeFromProp,
    localeFromOwnProp: props.locale !== undefined,
  };
  if (inheritedLocale !== undefined) rootProps.locale = inheritedLocale;
  if (parentLocale !== undefined) rootProps.parentLocale = parentLocale;
  if (inheritedTranslations !== undefined) rootProps.translations = inheritedTranslations;
  if (onActiveLocaleChange !== undefined) rootProps.onActiveLocaleChange = onActiveLocaleChange;
  if (parentAddLocaleRoot !== undefined) rootProps.parentAddLocaleRoot = parentAddLocaleRoot;
  return rootProps;
}
