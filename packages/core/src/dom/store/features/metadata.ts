import type { MediaContentValue, MediaMetadataState } from '@videojs/media';
import { isMediaContentDataCapable } from '@videojs/media';
import { listen } from '@videojs/utils/dom';
import { definePlayerFeature } from '../../feature';
import type { PlayerFeatureConfig } from '../../player';

const MEDIA_CONTENT_TITLE = Symbol('@videojs/media-content-title');
const USER_CONTENT_TITLE = Symbol('@videojs/user-content-title');
const USER_DEFAULT_CONTENT_TITLE = Symbol('@videojs/user-default-content-title');
const SET_USER_CONTENT_TITLE = Symbol('@videojs/set-user-content-title');
const SET_USER_DEFAULT_CONTENT_TITLE = Symbol('@videojs/set-user-default-content-title');
const DEFAULT_CONTENT_TITLE = '';

interface MetadataSourceState extends Omit<MediaMetadataState, 'contentTitle'> {
  [MEDIA_CONTENT_TITLE]: MediaContentValue;
  [USER_CONTENT_TITLE]: MediaContentValue;
  [USER_DEFAULT_CONTENT_TITLE]: MediaContentValue;
  [SET_USER_CONTENT_TITLE](value: MediaContentValue): void;
  [SET_USER_DEFAULT_CONTENT_TITLE](value: MediaContentValue): void;
}

/**
 * Resolves user, media, and fallback content-title metadata into player state.
 * Included in the standard audio, video, and live presets.
 */
export const metadataFeature = definePlayerFeature({
  name: 'metadata',
  config: {
    contentTitle: {
      action: SET_USER_CONTENT_TITLE,
      state: USER_CONTENT_TITLE,
    },
    defaultContentTitle: {
      action: SET_USER_DEFAULT_CONTENT_TITLE,
      state: USER_DEFAULT_CONTENT_TITLE,
    },
  } satisfies PlayerFeatureConfig<MetadataSourceState>,
  state: ({ set }): MetadataSourceState => ({
    [MEDIA_CONTENT_TITLE]: undefined,
    [USER_CONTENT_TITLE]: undefined,
    [USER_DEFAULT_CONTENT_TITLE]: undefined,
    [SET_USER_CONTENT_TITLE]: (value) => set({ [USER_CONTENT_TITLE]: value }),
    [SET_USER_DEFAULT_CONTENT_TITLE]: (value) => set({ [USER_DEFAULT_CONTENT_TITLE]: value }),
    setContentTitle: (value) => set({ [USER_CONTENT_TITLE]: value }),
    setDefaultContentTitle: (value) => set({ [USER_DEFAULT_CONTENT_TITLE]: value }),
  }),
  derived: {
    contentTitle: ({ get }) =>
      get()[USER_CONTENT_TITLE] ??
      get()[MEDIA_CONTENT_TITLE] ??
      get()[USER_DEFAULT_CONTENT_TITLE] ??
      DEFAULT_CONTENT_TITLE,
  },
  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaContentDataCapable(media)) return;

    const sync = () => set({ [MEDIA_CONTENT_TITLE]: media.contentData?.title });
    sync();
    listen(media, 'contentdatachange', sync, { signal });
  },
});
