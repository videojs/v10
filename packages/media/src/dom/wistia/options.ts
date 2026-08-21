import { isBoolean, isNumber, isString } from '@videojs/utils/predicate';
import { kebabCase } from '@videojs/utils/string';

import type { WistiaMediaProps } from './props';
import { type WistiaSource, wistiaControlProps, wistiaPlayerDefaultOptions } from './source';

/** The media props that configure a Wistia player rather than name the media it plays. */
export type WistiaMediaOptionsProps = {
  [Key in 'autoplay' | 'controls' | 'loop' | 'poster' | 'preload']?: WistiaMediaProps[Key] | undefined;
};

/**
 * Wistia's options for the props a media element is written with — the translation both platforms need, in neither
 * one's terms: the custom element assigns the result as properties, React writes it as attributes.
 *
 * The whole set comes back every time, because a prop that goes away has to take its option with it. A prop that was
 * never given is left out rather than defaulted: a Wistia media is configured in Wistia's app too, and a `poster`
 * written for a consumer who said nothing would overrule that.
 *
 * `muted` is missing because it is the state a player _starts_ in, where this runs again on every render and every
 * attribute change; `src` and `source` because they name a media rather than configure one.
 */
export function wistiaMediaOptions(props: WistiaMediaOptionsProps): WistiaSource {
  return {
    ...wistiaPlayerDefaultOptions,
    ...(props.autoplay !== undefined && { autoplay: props.autoplay }),
    ...(props.loop !== undefined && { endVideoBehavior: props.loop ? 'loop' : 'default' }),
    ...(props.poster !== undefined && { poster: props.poster }),
    // An empty `preload` is what a bare `preload` attribute means; Wistia accepts only the three words.
    ...(props.preload !== undefined && { preload: props.preload || 'metadata' }),
    ...wistiaControlProps(props.controls ?? false),
  };
}

/**
 * Wistia's options as its element observes them: kebab-cased, every value a string. React's half of applying what
 * {@link wistiaMediaOptions} decides, where the custom element assigns the same options as properties.
 *
 * Attributes because they are what `<wistia-player>` watches and can read before anything of ours runs — it configures
 * itself as it connects, and React has no moment before that. Left to choose, React asks whether the camel-cased name
 * is a property of the element, and answers an option Wistia keeps off the prototype with a lowercased attribute it is
 * not watching. Booleans are spelled out for the same reason: `false` has React drop the attribute, and a dropped
 * attribute is Wistia's default instead — the difference between a chromeless player and one wearing two sets of
 * controls. Anything else has no attribute spelling at all and is left out, `playerColorGradient` being the one
 * documented option in that gap.
 */
export function wistiaAttributes(options: Record<string, unknown>): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(options)) {
    if (isString(value) || isNumber(value) || isBoolean(value)) attributes[kebabCase(key)] = String(value);
  }

  return attributes;
}
