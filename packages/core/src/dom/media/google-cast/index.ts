import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import type { MediaStreamType } from '../../../core/media/types';
import { GoogleCastLayer, type GoogleCastMedia } from './google-cast-layer';
import { loadCastFramework, requiresCastFramework } from './utils';

export interface GoogleCastProps {
  /** Source URL loaded on the Cast receiver. Falls back to the host's `src` / `currentSrc`. */
  src?: string | undefined;
  /** MIME type of the Cast source. When unset, the receiver infers it from the URL. */
  contentType?: string | undefined;
  /** Stream type used on the Cast receiver. */
  streamType?: MediaStreamType | undefined;
  /** Cast receiver application ID. Defaults to Google's default media receiver. */
  receiverApplicationId?: string | undefined;
  /** Custom data sent to the Cast receiver with the load request. */
  customData?: Record<string, unknown> | null | undefined;
}

/**
 * Google Cast extension. Constructs a {@link GoogleCastLayer} on install and
 * adds it to the host's layer chain for the lifetime of the install. The layer
 * forwards the media surface to the cast receiver while a session is connected,
 * and falls through to the layer below otherwise.
 *
 * @example
 * googleCast({ receiverApplicationId: 'CC1AD845' }).install(media);
 */
class GoogleCast implements GoogleCastProps, MediaExtension {
  #src: string | undefined;
  #contentType: string | undefined;
  #streamType: MediaStreamType | undefined;
  #receiverApplicationId: string | undefined;
  #customData: Record<string, unknown> | null | undefined;
  #media: GoogleCastMedia | null = null;
  #destroy: (() => void) | null = null;

  constructor(props: GoogleCastProps = {}) {
    Object.assign(this, props);
  }

  install(media: GoogleCastMedia) {
    if (!requiresCastFramework()) return;

    const uninstall = installExtension(googleCast, media, this);

    this.#media = media;

    if (!media.disableRemotePlayback) loadCastFramework();

    const googleCastLayer = new GoogleCastLayer(this);
    const removeGoogleCastLayer = addLayer(media, googleCastLayer);

    this.#destroy = () => {
      uninstall();
      removeGoogleCastLayer();
      googleCastLayer.destroy();
      this.#media = null;
    };
  }

  destroy() {
    this.#destroy?.();
    this.#destroy = null;
  }

  /** Source URL loaded on the Cast receiver. Falls back to a `<source>` child, `src`, then `currentSrc`. */
  get src() {
    return this.#src ?? this.#media?.querySelector('source')?.src ?? this.#media?.src ?? this.#media?.currentSrc ?? '';
  }

  set src(value: string) {
    if (this.#src === value) return;
    this.#src = value;
    this.#media?.load();
  }

  /** MIME type of the Cast source. When unset, the receiver infers it from the URL. */
  get contentType() {
    return this.#contentType;
  }

  set contentType(value: string | undefined) {
    if (this.#contentType === value) return;
    this.#contentType = value;
    this.#media?.load();
  }

  /** Stream type used on the Cast receiver. Falls back to the host's `streamType` if it exposes one. */
  get streamType() {
    return this.#streamType ?? (this.#media as { streamType?: MediaStreamType } | null)?.streamType;
  }

  set streamType(value: MediaStreamType | undefined) {
    if (this.#streamType === value) return;
    this.#streamType = value;
    this.#media?.load();
  }

  /** Cast receiver application ID. Read on session start; falls back to the layer's default. */
  get receiverApplicationId() {
    return this.#receiverApplicationId;
  }

  set receiverApplicationId(value: string | undefined) {
    if (this.#receiverApplicationId === value) return;
    this.#receiverApplicationId = value;
    this.#media?.load();
  }

  /** Custom data sent to the Cast receiver with the load request. */
  get customData() {
    return this.#customData;
  }

  set customData(value: Record<string, unknown> | null | undefined) {
    if (this.#customData === value) return;
    this.#customData = value;
    this.#media?.load();
  }
}

export function googleCast(props: GoogleCastProps = {}) {
  return new GoogleCast(props);
}
