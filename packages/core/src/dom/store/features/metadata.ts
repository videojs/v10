import type { MediaContentValue, MediaMetadataState } from '@videojs/media';
import { isMediaContentDataCapable } from '@videojs/media';
import { listen } from '@videojs/utils/dom';
import { definePlayerFeature } from '../../feature';
import type { PlayerFeatureConfig } from '../../player';

const MEDIA_CONTENT_TITLE = Symbol('@videojs/media-content-title');
const USER_CONTENT_TITLE = Symbol('@videojs/user-content-title');
const USER_DEFAULT_CONTENT_TITLE = Symbol('@videojs/user-default-content-title');
const DEFAULT_CONTENT_TITLE = '';

const MEDIA_POSTER = Symbol('@videojs/media-poster');
const USER_POSTER = Symbol('@videojs/user-poster');
const USER_DEFAULT_POSTER = Symbol('@videojs/user-default-poster');
const DEFAULT_POSTER = '';

const MEDIA_PLACEHOLDER = Symbol('@videojs/media-placeholder');
const USER_PLACEHOLDER = Symbol('@videojs/user-placeholder');
const USER_DEFAULT_PLACEHOLDER = Symbol('@videojs/user-default-placeholder');
const DEFAULT_PLACEHOLDER = '';

interface MetadataSourceState extends Omit<MediaMetadataState, 'contentTitle' | 'poster' | 'placeholder'> {
  [MEDIA_CONTENT_TITLE]: MediaContentValue;
  [USER_CONTENT_TITLE]: MediaContentValue;
  [USER_DEFAULT_CONTENT_TITLE]: MediaContentValue;
  [MEDIA_POSTER]: MediaContentValue;
  [USER_POSTER]: MediaContentValue;
  [USER_DEFAULT_POSTER]: MediaContentValue;
  [MEDIA_PLACEHOLDER]: MediaContentValue;
  [USER_PLACEHOLDER]: MediaContentValue;
  [USER_DEFAULT_PLACEHOLDER]: MediaContentValue;
}

/**
 * Resolves user, media, and fallback content metadata into player state.
 * Included in the standard audio, video, and live presets.
 */
export const metadataFeature = definePlayerFeature({
  name: 'metadata',
  config: {
    contentTitle: {
      action: 'setContentTitle',
      state: USER_CONTENT_TITLE,
    },
    defaultContentTitle: {
      action: 'setDefaultContentTitle',
      state: USER_DEFAULT_CONTENT_TITLE,
    },
    poster: {
      action: 'setPoster',
      state: USER_POSTER,
    },
    defaultPoster: {
      action: 'setDefaultPoster',
      state: USER_DEFAULT_POSTER,
    },
    placeholder: {
      action: 'setPlaceholder',
      state: USER_PLACEHOLDER,
    },
    defaultPlaceholder: {
      action: 'setDefaultPlaceholder',
      state: USER_DEFAULT_PLACEHOLDER,
    },
  } satisfies PlayerFeatureConfig<MetadataSourceState>,
  state: ({ set }): MetadataSourceState => ({
    [MEDIA_CONTENT_TITLE]: undefined,
    [USER_CONTENT_TITLE]: undefined,
    [USER_DEFAULT_CONTENT_TITLE]: undefined,
    [MEDIA_POSTER]: undefined,
    [USER_POSTER]: undefined,
    [USER_DEFAULT_POSTER]: undefined,
    [MEDIA_PLACEHOLDER]: undefined,
    [USER_PLACEHOLDER]: undefined,
    [USER_DEFAULT_PLACEHOLDER]: undefined,
    setContentTitle: (value) => set({ [USER_CONTENT_TITLE]: value }),
    setDefaultContentTitle: (value) => set({ [USER_DEFAULT_CONTENT_TITLE]: value }),
    setPoster: (value) => set({ [USER_POSTER]: value }),
    setDefaultPoster: (value) => set({ [USER_DEFAULT_POSTER]: value }),
    setPlaceholder: (value) => set({ [USER_PLACEHOLDER]: value }),
    setDefaultPlaceholder: (value) => set({ [USER_DEFAULT_PLACEHOLDER]: value }),
  }),
  derived: {
    contentTitle: ({ get }) =>
      get()[USER_CONTENT_TITLE] ??
      get()[MEDIA_CONTENT_TITLE] ??
      get()[USER_DEFAULT_CONTENT_TITLE] ??
      DEFAULT_CONTENT_TITLE,
    poster: ({ get }) => get()[USER_POSTER] ?? get()[MEDIA_POSTER] ?? get()[USER_DEFAULT_POSTER] ?? DEFAULT_POSTER,
    placeholder: ({ get }) =>
      get()[USER_PLACEHOLDER] ?? get()[MEDIA_PLACEHOLDER] ?? get()[USER_DEFAULT_PLACEHOLDER] ?? DEFAULT_PLACEHOLDER,
  },
  attach({ target, signal, set }) {
    const { media } = target;

    if (!isMediaContentDataCapable(media)) return;

    const sync = () =>
      set({
        [MEDIA_CONTENT_TITLE]: media.contentData?.title,
        [MEDIA_POSTER]: media.contentData?.poster,
        [MEDIA_PLACEHOLDER]: media.contentData?.placeholder,
      });
    sync();
    listen(media, 'contentdatachange', sync, { signal });
  },
});
