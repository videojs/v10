import { defineExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import type { HTMLMediaElementHost } from '../html-media-element-host';
import { HTMLMediaElementLayer } from '../html-media-element-layer';

export type NativeHlsStreamTypeMedia = HTMLMediaElementHost<HTMLMediaElement, any>;

/**
 * Derives `streamType` from the underlying media element's `duration`:
 * `Infinity` → `LIVE`, finite/positive → `ON_DEMAND`, otherwise `UNKNOWN`.
 *
 * Detection is re-run on `durationchange` / `loadedmetadata` and reset on
 * `emptied`. Setting `streamType` to anything other than `UNKNOWN` locks in
 * the user override; setting it to `UNKNOWN` returns control to detection.
 *
 * @example nativeHlsStreamType().install(media);
 */
export class NativeHlsStreamType {
  readonly name = 'native-hls-stream-type';

  install(media: NativeHlsStreamTypeMedia) {
    return addLayer(media, new NativeHlsStreamTypeLayer());
  }
}

export const nativeHlsStreamType = defineExtension<void, NativeHlsStreamTypeMedia, NativeHlsStreamType>(
  () => new NativeHlsStreamType()
);

class NativeHlsStreamTypeLayer extends HTMLMediaElementLayer {
  #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
  #userOverride = false;
  #abort: AbortController | null = null;

  override get streamType(): MediaStreamType {
    return this.#streamType;
  }

  override set streamType(streamType: MediaStreamType) {
    if (streamType === MediaStreamTypes.UNKNOWN) {
      this.#userOverride = false;
      this.#detect();
      return;
    }
    this.#userOverride = true;
    this.#update(streamType);
  }

  override get target() {
    return super.target;
  }

  override set target(target: HTMLMediaElement | null) {
    this.#abort?.abort();
    this.#abort = null;

    super.target = target;

    if (target) {
      this.#abort = new AbortController();
      const { signal } = this.#abort;
      target.addEventListener('durationchange', () => this.#detect(), { signal });
      target.addEventListener('loadedmetadata', () => this.#detect(), { signal });
      target.addEventListener('emptied', () => this.#reset(), { signal });
    }

    this.#detect();
  }

  #detect() {
    if (this.#userOverride) return;
    this.#update(deriveStreamType(this.duration));
  }

  #reset() {
    if (this.#userOverride) return;
    this.#update(MediaStreamTypes.UNKNOWN);
  }

  #update(streamType: MediaStreamType) {
    if (this.#streamType === streamType) return;
    this.#streamType = streamType;
    this.dispatchEvent(new Event('streamtypechange'));
  }
}

function deriveStreamType(duration: number): MediaStreamType {
  if (duration === Number.POSITIVE_INFINITY) return MediaStreamTypes.LIVE;
  if (Number.isFinite(duration) && duration > 0) return MediaStreamTypes.ON_DEMAND;
  return MediaStreamTypes.UNKNOWN;
}
