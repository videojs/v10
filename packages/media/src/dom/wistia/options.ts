import { kebabCase } from '@videojs/utils/string';
import type { WistiaMediaProps } from './props';
import { type WistiaSource, wistiaControlProps, wistiaPlayerDefaultOptions } from './source';

/**
 * The media props that configure a Wistia player rather than name the media it plays. Written out rather
 * than `Partial`, so a caller can hand over the prop it does not have as `undefined` instead of having to
 * leave the key off — which is how both platforms read one that was never given.
 */
export type WistiaMediaOptionsProps = {
  [Key in 'autoplay' | 'controls' | 'loop' | 'poster' | 'preload']?: WistiaMediaProps[Key] | undefined;
};

/**
 * Wistia's options for the props a media element is written with.
 *
 * Both platforms translate the same handful — the custom element assigns them to the player as properties,
 * React writes them as attributes — so the translation lives here, in neither one's terms. It answers with
 * the whole set every time rather than with what changed, because a prop that goes away has to take its
 * option with it; an option left where it was last put is Wistia still doing what nobody is asking for.
 *
 * A prop that was never given is left out, which is not the same as giving it a default. A Wistia media is
 * configured in Wistia's app as well, and a `poster` or a `preload` written on behalf of a consumer who said
 * nothing would overrule that.
 *
 * Two of the media props are not here. `muted` is the state a player *starts* in, and this runs again on
 * every render and every attribute change, so re-applying it would put a mute back after the viewer cleared
 * it. `src` and `source` name a media rather than configure one, and each platform has its own moment to
 * change one.
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
 * Wistia's options, written the way its element observes them: kebab-cased, and every value a string.
 *
 * This is how React applies what {@link wistiaMediaOptions} decides, where the custom element assigns the
 * same options as properties. Attributes, because they are what `<wistia-player>` watches and what it can
 * read before anything has had a chance to run — a player configures itself as it connects, and React has
 * no moment before that. Left to itself React would choose between the two by asking whether the camel-cased
 * name is a property of the element, and answer an option Wistia keeps off the prototype with a lowercased
 * attribute name the element is not watching.
 *
 * Booleans are spelled out for the same reason React cannot be left to it: `false` would have React drop the
 * attribute, and a dropped attribute is Wistia's default rather than the `false` that was asked for — which
 * is the difference between a chromeless player and one wearing two sets of controls. Anything that is not a
 * string, number, or boolean has no attribute spelling at all and is left out; `playerColorGradient` is the
 * one documented option that falls in that gap, and Wistia's own React wrapper drops it too.
 */
export function wistiaAttributes(options: Record<string, unknown>): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const [key, value] of Object.entries(options)) {
    if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') continue;
    attributes[kebabCase(key)] = String(value);
  }

  return attributes;
}
