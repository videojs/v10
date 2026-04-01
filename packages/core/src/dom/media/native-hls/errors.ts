import { listen } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';

import { MediaError } from '../../../core/media/media-error';

export interface NativeMediaHost extends EventTarget {
  readonly target: HTMLMediaElement | null;
  attach(target: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
}

export function NativeHlsMediaErrorsMixin<Base extends Constructor<NativeMediaHost>>(BaseClass: Base) {
  class NativeMediaErrors extends (BaseClass as Constructor<NativeMediaHost>) {
    #disconnect: AbortController | null = null;
    #error: MediaError | null = null;

    get error(): MediaError | null {
      return this.#error;
    }

    attach(target: HTMLMediaElement): void {
      super.attach(target);
      this.#init(target);
    }

    detach(): void {
      this.#destroy();
      super.detach();
    }

    destroy(): void {
      this.#destroy();
      super.destroy();
    }

    #init(target: HTMLMediaElement): void {
      this.#destroy();
      this.#disconnect = new AbortController();

      listen(
        target,
        'error',
        (event) => {
          event.stopImmediatePropagation();

          const native = target.error;
          if (!native) return;

          const error = new MediaError(native.message, native.code, true);
          this.#error = error;

          this.dispatchEvent(new ErrorEvent('error', { error, message: error.message }));
        },
        { signal: this.#disconnect.signal }
      );
    }

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#error = null;
    }
  }

  return NativeMediaErrors as unknown as Base & Constructor<{ readonly error: MediaError | null }>;
}
