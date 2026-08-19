/**
 * Mock metadata feature — mirrors the real one's shape.
 *
 * Exercises: a published shape that is `derived` keys alone, since the source
 * state omits every member of the interface it extends and keeps the rest
 * behind symbols; symbol-keyed actions typed from their own declarations; an
 * `html.attribute` that renames the input in markup, alongside an entry that
 * omits it and falls back to the kebab-cased key; config JSDoc → input
 * description; and `satisfies` around the config map.
 *
 * The feature has no public actions at all, so this fixture also pins that an
 * empty actions record is what the reference gets.
 *
 * Public setters, named-outright actions, and the degrade paths live in the
 * caption-style fixture, since the real metadata feature uses none of them.
 */
import type { MediaContentValue, MediaMetadataState } from '../../../../../media/src/core/state';
import { definePlayerFeature, type PlayerFeatureConfig } from '../../feature';

const MEDIA_TITLE = Symbol('media-title');
const USER_TITLE = Symbol('user-title');
const SET_USER_TITLE = Symbol('set-user-title');
const DEFAULT_TITLE = '';

const MEDIA_POSTER = Symbol('media-poster');
const USER_POSTER = Symbol('user-poster');
const SET_USER_POSTER = Symbol('set-user-poster');
const DEFAULT_POSTER = '';

interface MetadataSourceState extends Omit<MediaMetadataState, 'title' | 'poster'> {
  [MEDIA_TITLE]: MediaContentValue;
  [USER_TITLE]: MediaContentValue;
  [SET_USER_TITLE](value: MediaContentValue): void;
  [MEDIA_POSTER]: MediaContentValue;
  [USER_POSTER]: MediaContentValue;
  [SET_USER_POSTER](value: MediaContentValue): void;
}

/** Resolves user and media content metadata into player state. */
export const metadataFeature = definePlayerFeature({
  name: 'metadata',
  config: {
    /** The title to display. Takes precedence over the title the media carries. */
    title: {
      action: SET_USER_TITLE,
      state: USER_TITLE,
      html: { attribute: 'content-title' },
    },
    /** The poster to display. Takes precedence over the poster the media carries. */
    poster: {
      action: SET_USER_POSTER,
      state: USER_POSTER,
    },
  } satisfies PlayerFeatureConfig<MetadataSourceState>,
  state: (): MetadataSourceState => ({
    [MEDIA_TITLE]: undefined,
    [USER_TITLE]: undefined,
    [SET_USER_TITLE]: () => {},
    [MEDIA_POSTER]: undefined,
    [USER_POSTER]: undefined,
    [SET_USER_POSTER]: () => {},
  }),
  derived: {
    /** The resolved content title. */
    title: (): string => DEFAULT_TITLE,
    /** The resolved poster URL. */
    poster: (): string => DEFAULT_POSTER,
  },
});
