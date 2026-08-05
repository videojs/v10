import type { MediaContentValue, MediaMetadataState } from '@videojs/media';
import { isMediaContentDataCapable } from '@videojs/media';
import { listen } from '@videojs/utils/dom';
import { definePlayerFeature } from '../../feature';

const MEDIA_CONTENT_TITLE = Symbol('vjs.contentTitle.media');
const DEFAULT_CONTENT_TITLE = '';

export interface MetadataConfig {
  /** User title override. */
  contentTitle: string | null;
  /** User fallback after the media-owned title tier. */
  defaultContentTitle: string | null;
}

interface MetadataSourceState extends Omit<MediaMetadataState, 'contentTitle'> {
  [MEDIA_CONTENT_TITLE]: MediaContentValue;
}

/**
 * Resolves user, media, and fallback content-title metadata into player state.
 * Included in the standard audio, video, and live presets.
 */
export const metadataFeature = definePlayerFeature<MetadataConfig>()({
  name: 'metadata',
  config: {
    contentTitle: null,
    defaultContentTitle: null,
  },
  state: ({ config }): MetadataSourceState => ({
    [MEDIA_CONTENT_TITLE]: undefined,
    setContentTitle: (value) => config.set({ contentTitle: value }),
    setDefaultContentTitle: (value) => config.set({ defaultContentTitle: value }),
  }),
  derived: {
    contentTitle: ({ get, config }) =>
      config.get().contentTitle ??
      get()[MEDIA_CONTENT_TITLE] ??
      config.get().defaultContentTitle ??
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
