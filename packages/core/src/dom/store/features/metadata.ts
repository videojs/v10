import type { MediaContentValue, MediaMetadataState } from '@videojs/media';
import { isMediaContentDataCapable } from '@videojs/media';
import { listen } from '@videojs/utils/dom';
import { definePlayerFeature } from '../../feature';
import type { PlayerFeatureConfig } from '../../player';

const MEDIA_TITLE = Symbol('@videojs/media-title');
const USER_TITLE = Symbol('@videojs/user-title');
const SET_USER_TITLE = Symbol('@videojs/set-user-title');
const DEFAULT_TITLE = '';

const MEDIA_POSTER = Symbol('@videojs/media-poster');
const USER_POSTER = Symbol('@videojs/user-poster');
const SET_USER_POSTER = Symbol('@videojs/set-user-poster');
const DEFAULT_POSTER = '';

interface MetadataSourceState extends Omit<MediaMetadataState, 'title' | 'poster'> {
  [MEDIA_TITLE]: MediaContentValue;
  [USER_TITLE]: MediaContentValue;
  [SET_USER_TITLE](value: MediaContentValue): void;
  [MEDIA_POSTER]: MediaContentValue;
  [USER_POSTER]: MediaContentValue;
  [SET_USER_POSTER](value: MediaContentValue): void;
}

/**
 * Resolves content metadata into player state, preferring what the author set
 * over what the media carries. Included in the standard audio, video, and live
 * presets.
 */
export const metadataFeature = definePlayerFeature({
  name: 'metadata',
  config: {
    title: {
      action: SET_USER_TITLE,
      state: USER_TITLE,
      // `title` already means the tooltip on an element, so the input takes
      // another name there.
      html: { attribute: 'content-title' },
    },
    poster: {
      action: SET_USER_POSTER,
      state: USER_POSTER,
    },
  } satisfies PlayerFeatureConfig<MetadataSourceState>,
  state: ({ set }): MetadataSourceState => ({
    [MEDIA_TITLE]: undefined,
    [USER_TITLE]: undefined,
    [SET_USER_TITLE]: (value) => set({ [USER_TITLE]: value }),
    [MEDIA_POSTER]: undefined,
    [USER_POSTER]: undefined,
    [SET_USER_POSTER]: (value) => set({ [USER_POSTER]: value }),
  }),
  derived: {
    title: ({ get }) => get()[USER_TITLE] ?? get()[MEDIA_TITLE] ?? DEFAULT_TITLE,
    poster: ({ get }) => get()[USER_POSTER] ?? get()[MEDIA_POSTER] ?? DEFAULT_POSTER,
  },
  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaContentDataCapable(media)) return;

    const sync = () =>
      set({
        [MEDIA_TITLE]: media.contentData?.title,
        [MEDIA_POSTER]: media.contentData?.poster,
      });
    sync();
    listen(media, 'contentdatachange', sync, { signal });
  },
});
