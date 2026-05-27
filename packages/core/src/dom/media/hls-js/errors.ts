import type { ErrorData } from 'hls.js';
import Hls from 'hls.js';
import { MediaError } from '../../../core/media/media-error';
import { defineExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import type { HTMLMediaElementHost } from '../html-media-element-host';
import { HTMLMediaElementLayer } from '../html-media-element-layer';

export type HlsJsErrorsMedia = HTMLMediaElementHost<HTMLMediaElement, any> & {
  engine?: Hls | null;
};

const hlsErrorTypeToCode: Record<string, number> = {
  [Hls.ErrorTypes.NETWORK_ERROR]: MediaError.MEDIA_ERR_NETWORK,
  [Hls.ErrorTypes.MEDIA_ERROR]: MediaError.MEDIA_ERR_DECODE,
  [Hls.ErrorTypes.KEY_SYSTEM_ERROR]: MediaError.MEDIA_ERR_ENCRYPTED,
  [Hls.ErrorTypes.MUX_ERROR]: MediaError.MEDIA_ERR_DECODE,
  [Hls.ErrorTypes.OTHER_ERROR]: MediaError.MEDIA_ERR_CUSTOM,
};

/**
 * Maps fatal hls.js errors to {@link MediaError} and exposes the result via
 * the chain's `error` getter. Each `MANIFEST_LOADING` / `MEDIA_ATTACHED`
 * starts a fresh session; `MEDIA_DETACHED` / `DESTROYING` clears it.
 *
 * @example hlsJsErrors().install(media);
 */
export class HlsJsErrors {
  readonly name = 'hls-js-errors';

  install(media: HlsJsErrorsMedia) {
    const { engine } = media;
    if (!engine) return;

    const mediaLayer = new HlsJsErrorsLayer();
    const removeLayer = addLayer(media, mediaLayer);

    let sessionAbort: AbortController | null = null;

    const init = () => {
      sessionAbort?.abort();
      sessionAbort = new AbortController();

      const onError = (_event: string, data: ErrorData) => {
        if (!data.fatal) return;

        const code = hlsErrorTypeToCode[data.type] ?? MediaError.MEDIA_ERR_CUSTOM;
        const error = new MediaError(data.error?.message, code, true, data.details);
        error.data = data;

        mediaLayer.setError(error);
        media.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
      };

      engine.on(Hls.Events.ERROR, onError);
      sessionAbort.signal.addEventListener(
        'abort',
        () => {
          engine.off(Hls.Events.ERROR, onError);
          mediaLayer.setError(null);
        },
        { once: true }
      );
    };

    const reset = () => {
      sessionAbort?.abort();
      sessionAbort = null;
    };

    engine.on(Hls.Events.MANIFEST_LOADING, init);
    engine.on(Hls.Events.MEDIA_ATTACHED, init);
    engine.on(Hls.Events.MEDIA_DETACHED, reset);
    engine.on(Hls.Events.DESTROYING, reset);

    return () => {
      reset();
      engine.off(Hls.Events.MANIFEST_LOADING, init);
      engine.off(Hls.Events.MEDIA_ATTACHED, init);
      engine.off(Hls.Events.MEDIA_DETACHED, reset);
      engine.off(Hls.Events.DESTROYING, reset);
      removeLayer();
    };
  }
}

export const hlsJsErrors = defineExtension<void, HlsJsErrorsMedia, HlsJsErrors>(() => new HlsJsErrors());

class HlsJsErrorsLayer extends HTMLMediaElementLayer {
  #error: MediaError | null = null;

  override get error() {
    return this.#error;
  }

  setError(error: MediaError | null) {
    this.#error = error;
  }
}
