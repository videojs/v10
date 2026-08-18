import type { Constructor } from '@videojs/utils/types';

import { MediaError } from '../../core/media-error';
import type { HTMLVideoElementHost } from '../video-host';

export type NativeMediaHost = HTMLVideoElementHost;

export function NativeHlsMediaErrorsMixin<Base extends Constructor<NativeMediaHost>>(BaseClass: Base) {
  class NativeHlsMediaErrors extends (BaseClass as Constructor<NativeMediaHost>) {
    #disconnect: AbortController | null = null;
    #error: MediaError | null = null;

    get error(): MediaError | null {
      return this.#error;
    }

    /**
     * Announce `error` as coming from this media, latching it as the current
     * error when it is fatal. Non-fatal errors are announced only — playback
     * continues, so they must not stand in for whatever fails next.
     *
     * For siblings producing errors the media element never reports itself:
     * DRM key exchange, notably, which fails entirely outside the element.
     *
     * @internal
     */
    setError(error: MediaError): void {
      if (error.fatal) this.#error = error;
      this.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
    }

    attach(target: HTMLVideoElement): void {
      super.attach(target);
      this.#init(target);
    }

    detach(): void {
      this.#destroy();
      super.detach?.();
    }

    destroy(): void {
      this.#destroy();
      super.destroy?.();
    }

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#error = null;
    }

    #init(target: HTMLMediaElement): void {
      this.#destroy();
      this.#disconnect = new AbortController();

      const signal = this.#disconnect.signal;

      target.addEventListener(
        'error',
        (event) => {
          event.stopImmediatePropagation();

          const native = target.error;
          if (!native) return;

          const code = native.code;
          const useCanonicalMessage = code >= MediaError.MEDIA_ERR_ABORTED && code <= MediaError.MEDIA_ERR_ENCRYPTED;
          this.setError(new MediaError(useCanonicalMessage ? undefined : native.message, code, true));
        },
        { signal, capture: true }
      );

      target.addEventListener(
        'emptied',
        () => {
          this.#error = null;
        },
        { signal }
      );
    }
  }

  return NativeHlsMediaErrors as unknown as Base &
    Constructor<{ readonly error: MediaError | null; setError(error: MediaError): void }>;
}
