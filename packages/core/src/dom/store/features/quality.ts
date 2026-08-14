import type {
  MediaQualityState,
  MediaVideoRendition,
  VideoRenditionLike,
  VideoRenditionListLike,
} from '@videojs/media';
import { isMediaVideoDimensionsCapable, isMediaVideoRenditionCapable } from '@videojs/media';
import { listen } from '@videojs/utils/dom';
import { definePlayerFeature } from '../../feature';

function toMediaRendition(rendition: VideoRenditionLike): MediaVideoRendition {
  return {
    ...(rendition.id !== undefined && { id: rendition.id }),
    ...(rendition.width !== undefined && { width: rendition.width }),
    ...(rendition.height !== undefined && { height: rendition.height }),
    ...(rendition.bitrate !== undefined && { bitrate: rendition.bitrate }),
    ...(rendition.frameRate !== undefined && { frameRate: rendition.frameRate }),
    ...(rendition.codec !== undefined && { codec: rendition.codec }),
    selected: rendition.selected,
  };
}

function getSize(rendition: Pick<VideoRenditionLike, 'width' | 'height'>): number | undefined {
  if (rendition.width && rendition.height) return Math.min(rendition.width, rendition.height);
  return rendition.height ?? rendition.width;
}

export const qualityFeature = definePlayerFeature({
  name: 'quality',
  state: ({ target }): MediaQualityState => ({
    videoRenditionList: [],
    activeVideoRendition: null,
    selectVideoRendition(index: number | null) {
      const { media } = target();
      if (!isMediaVideoRenditionCapable(media)) return;

      if (index === null) {
        media.videoRenditions.selectedIndex = -1;
        return;
      }

      if (index >= 0 && index < media.videoRenditions.length) media.videoRenditions.selectedIndex = index;
    },
  }),

  attach({ target, signal, set }) {
    const { media } = target;
    let videoRenditions: VideoRenditionListLike | null = null;
    let cleanup: AbortController | null = null;

    const getVideoRenditions = () => (isMediaVideoRenditionCapable(media) ? media.videoRenditions : null);
    const getActiveRendition = (list: VideoRenditionListLike | null) => {
      if (!list) return null;

      const renditions = [...list];
      const active = renditions.find((rendition) => rendition.active);
      if (active) return active;

      if (!isMediaVideoDimensionsCapable(media) || (!media.videoWidth && !media.videoHeight)) return null;

      const size = getSize({
        width: media.videoWidth || undefined,
        height: media.videoHeight || undefined,
      });
      const matches = renditions.filter((rendition) => getSize(rendition) === size);

      return matches.length === 1 ? matches[0] : null;
    };

    const sync = (list = getVideoRenditions()) => {
      const active = getActiveRendition(list);

      set({
        videoRenditionList: list ? [...list].map(toMediaRendition) : [],
        activeVideoRendition: active ? toMediaRendition(active) : null,
      });
    };

    const bind = () => {
      const nextVideoRenditions = getVideoRenditions();

      if (nextVideoRenditions === videoRenditions) {
        sync(nextVideoRenditions);
        return;
      }

      cleanup?.abort();
      cleanup = new AbortController();
      videoRenditions = nextVideoRenditions;

      if (videoRenditions) {
        listen(videoRenditions, 'addrendition', () => sync(videoRenditions), { signal: cleanup.signal });
        listen(videoRenditions, 'removerendition', () => sync(videoRenditions), { signal: cleanup.signal });
        listen(videoRenditions, 'change', () => sync(videoRenditions), { signal: cleanup.signal });
        listen(videoRenditions, 'activechange', () => sync(videoRenditions), { signal: cleanup.signal });
      }

      sync(videoRenditions);
    };

    bind();

    listen(media, 'loadstart', bind, { signal });
    listen(media, 'resize', () => sync(videoRenditions), { signal });
    signal.addEventListener('abort', () => cleanup?.abort(), { once: true });
  },
});
