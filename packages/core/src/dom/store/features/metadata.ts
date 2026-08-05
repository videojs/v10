import type { MediaContentValue, MediaMetadataState } from '@videojs/media';
import { isMediaContentDataCapable } from '@videojs/media';
import { listen } from '@videojs/utils/dom';
import { definePlayerFeature } from '../../feature';

const MEDIA_CONTENT_TITLE = Symbol('vjs.contentTitle.media');
const USER_CONTENT_TITLE = Symbol('vjs.contentTitle.user');
const USER_DEFAULT_CONTENT_TITLE = Symbol('vjs.defaultContentTitle.user');
const SET_USER_CONTENT_TITLE = Symbol('vjs.contentTitle.user.set');
const SET_USER_DEFAULT_CONTENT_TITLE = Symbol('vjs.defaultContentTitle.user.set');
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
      preserve: USER_CONTENT_TITLE,
    },
    defaultContentTitle: {
      action: SET_USER_DEFAULT_CONTENT_TITLE,
      preserve: USER_DEFAULT_CONTENT_TITLE,
    },
  },
  state: ({ set }): MetadataSourceState => {
    const setUserContentTitle = (value: MediaContentValue) => set({ [USER_CONTENT_TITLE]: value });
    const setUserDefaultContentTitle = (value: MediaContentValue) => set({ [USER_DEFAULT_CONTENT_TITLE]: value });

    return {
      [MEDIA_CONTENT_TITLE]: undefined,
      [USER_CONTENT_TITLE]: undefined,
      [USER_DEFAULT_CONTENT_TITLE]: undefined,
      [SET_USER_CONTENT_TITLE]: setUserContentTitle,
      [SET_USER_DEFAULT_CONTENT_TITLE]: setUserDefaultContentTitle,
      setContentTitle: setUserContentTitle,
      setDefaultContentTitle: setUserDefaultContentTitle,
    };
  },
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
