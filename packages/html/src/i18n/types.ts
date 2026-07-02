import type { Translations } from '@videojs/core/i18n';
import type { ReactiveElement } from '@videojs/element';
import type { Constructor } from '@videojs/utils/types';

/**
 * `Constructor<ReactiveElement>` does not imply static `properties`; this intersection matches how
 * mixins spread {@link ReactiveElement.properties} from their base.
 */
export type ReactiveElementMixinBase = Constructor<ReactiveElement> & Pick<typeof ReactiveElement, 'properties'>;

/**
 * Function to load partial or full translations for a given locale.
 */
export type LocaleLoader = (tag: string) => Promise<Partial<Translations> | undefined>;
