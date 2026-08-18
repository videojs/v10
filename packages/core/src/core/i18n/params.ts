import type { Contains, UnionToIntersection } from '@videojs/utils/types';
import type { LOCALES } from './locales';
import type { TranslationParams } from './params.generated';

/** BCP 47 language tag; built-ins are narrowed for autocomplete. */
export type Locale = (typeof LOCALES)[number] | (string & {});

/** Nested shape used by authored locale files. */
export interface Translations {
  readonly [key: string]: string | Translations | undefined;
}

export type { TranslationParams } from './params.generated';

export type TranslationKey = keyof TranslationParams;

type ParametricKey = {
  [Key in TranslationKey]: TranslationParams[Key] extends never ? never : Key;
}[TranslationKey];

type ParametricTemplate<Params> =
  Params extends Record<string, unknown>
    ? UnionToIntersection<
        {
          [Name in keyof Params & string]: Contains<`{${Name}}`>;
        }[keyof Params & string]
      >
    : never;

type ParametricTranslations = {
  [Key in ParametricKey]: ParametricTemplate<TranslationParams[Key]>;
};

/** Player copy keyed by semantic key; all entries are optional overlays. */
export type FlatTranslations = {
  [Key in TranslationKey]?: TranslationParams[Key] extends never
    ? string
    : Key extends keyof ParametricTranslations
      ? ParametricTranslations[Key]
      : string;
} & Record<string, string | undefined>;
