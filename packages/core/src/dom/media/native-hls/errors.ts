import { MediaError } from '../../../core/media/media-error';
import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import type { HTMLVideoElementHost } from '../html-video-element-host';
import { HTMLVideoElementLayer } from '../html-video-element-layer';

/**
 * Wraps native `error` events on the media element into `MediaError`, exposes
 * the result via the chain's `error` getter, and stops the native event from
 * propagating to other listeners on the target.
 *
 * @example nativeHlsErrors().install(media);
 */
class NativeHlsErrors implements MediaExtension {
  #destroy: () => void = () => {};

  install(media: HTMLVideoElementHost) {
    const uninstall = installExtension(nativeHlsErrors, media, this);
    const removeLayer = addLayer(media, new NativeHlsErrorsLayer());
    this.#destroy = () => {
      uninstall();
      removeLayer();
    };
  }

  destroy() {
    this.#destroy();
    this.#destroy = () => {};
  }
}

export function nativeHlsErrors() {
  return new NativeHlsErrors();
}

class NativeHlsErrorsLayer extends HTMLVideoElementLayer {
  #error: MediaError | null = null;
  #abort: AbortController | null = null;

  override get error() {
    return this.#error;
  }

  override get target() {
    return super.target;
  }

  override set target(target: HTMLVideoElement | null) {
    this.#abort?.abort();
    this.#abort = null;
    this.#error = null;

    if (target) {
      this.#abort = new AbortController();
      const { signal } = this.#abort;

      target.addEventListener(
        'error',
        (event) => {
          event.stopImmediatePropagation();

          const native = target.error;
          if (!native) return;

          const error = new MediaError(native.message, native.code, true);
          this.#error = error;
          this.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
        },
        { capture: true, signal }
      );
      target.addEventListener('emptied', () => (this.#error = null), { signal });
    }

    super.target = target;
  }
}
