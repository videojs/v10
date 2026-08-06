/**
 * Mock metadata feature — mirrors the real one's shape.
 *
 * Exercises: `@state` override (the state() annotation names private source
 * state, so the published interface comes from the tag), `config` inputs typed
 * from symbol-keyed private actions, initial values read from state(), config
 * JSDoc → input description, and `satisfies` around the config map.
 */
import type { MediaContentValue, MediaMetadataState } from '../../../../../media/src/core/state';
import { definePlayerFeature, type PlayerFeatureConfig } from '../../feature';

const MEDIA_CONTENT_TITLE = Symbol('media-content-title');
const USER_CONTENT_TITLE = Symbol('user-content-title');
const USER_DEFAULT_CONTENT_TITLE = Symbol('user-default-content-title');
const SET_USER_CONTENT_TITLE = Symbol('set-user-content-title');
const SET_USER_DEFAULT_CONTENT_TITLE = Symbol('set-user-default-content-title');

interface MetadataSourceState extends Omit<MediaMetadataState, 'contentTitle'> {
  [MEDIA_CONTENT_TITLE]: MediaContentValue;
  [USER_CONTENT_TITLE]: MediaContentValue;
  [USER_DEFAULT_CONTENT_TITLE]: MediaContentValue;
  [SET_USER_CONTENT_TITLE](value: MediaContentValue): void;
  [SET_USER_DEFAULT_CONTENT_TITLE](value: MediaContentValue): void;
}

/**
 * Resolves user, media, and fallback content-title metadata into player state.
 *
 * @state MediaMetadataState
 */
export const metadataFeature = definePlayerFeature({
  name: 'metadata',
  config: {
    /** The title to display. Takes precedence over the media's title. */
    contentTitle: {
      action: SET_USER_CONTENT_TITLE,
      state: USER_CONTENT_TITLE,
    },
    /** Fallback used when neither the user nor the media supplies a title. */
    defaultContentTitle: {
      action: SET_USER_DEFAULT_CONTENT_TITLE,
      state: USER_DEFAULT_CONTENT_TITLE,
    },
  } satisfies PlayerFeatureConfig<MetadataSourceState>,
  state: (): MetadataSourceState => ({
    [MEDIA_CONTENT_TITLE]: undefined,
    [USER_CONTENT_TITLE]: undefined,
    [USER_DEFAULT_CONTENT_TITLE]: undefined,
    [SET_USER_CONTENT_TITLE]: () => {},
    [SET_USER_DEFAULT_CONTENT_TITLE]: () => {},
    setContentTitle: () => {},
    setDefaultContentTitle: () => {},
  }),
  derived: {
    contentTitle: () => '',
  },
});
