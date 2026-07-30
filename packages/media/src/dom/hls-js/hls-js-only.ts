import type { MixinReturn } from '@videojs/utils/types';
import Hls, { type HlsConfig } from 'hls.js';
import type { MediaError } from '../../core/media-error';
import { MediaTracksMixin, type WithMediaTracks } from '../../core/media-tracks';
import type {
  MediaEngineHost,
  MediaLiveCapability,
  MediaSourceCapability,
  MediaStreamTypeCapability,
} from '../../core/types';
import { HTMLVideoElementHost } from '../video-host';
import { HlsJsMediaAirPlayMixin } from './airplay-bridge';
import { type DrmConfig, HlsJsMediaDrmMixin, type HlsJsMediaDrmProps } from './drm';
import { HlsJsMediaErrorsMixin } from './errors';
import { HlsJsMediaLiveMixin } from './live';
import { HlsJsMediaMediaTracksMixin } from './media-tracks';
import { HlsJsMediaMetadataTracksMixin } from './metadata-tracks';
import { HlsJsMediaPreloadMixin } from './preload';
import { HlsJsMediaStreamTypeMixin } from './stream-type';
import { HlsJsMediaTextTracksMixin } from './text-tracks';

export const defaultHlsConfig: Partial<HlsConfig> = {
  backBufferLength: 30,
  renderTextTracksNatively: false,
  liveDurationInfinity: true,
  capLevelToPlayerSize: true,
  capLevelOnFPSDrop: true,
  autoStartLoad: false,
};

export interface HlsJsOnlyMediaParams {
  /** Options forwarded to the hls.js constructor, merged over {@link defaultHlsConfig}. */
  config: Partial<HlsConfig>;
  /** License servers for DRM-protected playback. Consumed by the DRM mixin. */
  drm?: DrmConfig | null;
}

class HlsJsOnlyMediaBase extends HTMLVideoElementHost implements MediaEngineHost<Hls, HTMLVideoElement> {
  #engine: Hls | null = null;

  constructor(params: HlsJsOnlyMediaParams) {
    super();
    this.#engine = new Hls({
      ...defaultHlsConfig,
      ...params.config,
    });
  }

  get engine() {
    return this.#engine;
  }

  get src() {
    return this.#engine?.url ?? '';
  }

  set src(src: string) {
    this.#engine?.loadSource(src);
  }

  attach(target: HTMLVideoElement) {
    super.attach(target);
    this.#engine?.attachMedia(target);
  }

  detach() {
    this.#engine?.detachMedia();
    super.detach();
  }

  destroy() {
    this.detach();
    this.#engine?.destroy();
    this.#engine = null;
  }
}

interface HlsJsMediaCapabilities
  extends MediaStreamTypeCapability,
    MediaLiveCapability,
    Pick<MediaSourceCapability, 'preload'>,
    HlsJsMediaDrmProps {
  readonly error: MediaError | null;
}

const HlsJsOnlyMediaComposed = HlsJsMediaAirPlayMixin(
  HlsJsMediaPreloadMixin(
    HlsJsMediaLiveMixin(
      HlsJsMediaStreamTypeMixin(
        HlsJsMediaMediaTracksMixin(
          HlsJsMediaMetadataTracksMixin(
            HlsJsMediaTextTracksMixin(HlsJsMediaDrmMixin(HlsJsMediaErrorsMixin(MediaTracksMixin(HlsJsOnlyMediaBase))))
          )
        )
      )
    )
  )
) as unknown as MixinReturn<WithMediaTracks<typeof HlsJsOnlyMediaBase>, HlsJsMediaCapabilities>;

export class HlsJsOnlyMedia extends HlsJsOnlyMediaComposed {}
