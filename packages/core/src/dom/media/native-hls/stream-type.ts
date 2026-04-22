import type { Constructor } from '@videojs/utils/types';
import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import type { NativeMediaHost } from './errors';

export function NativeHlsMediaStreamTypeMixin<Base extends Constructor<NativeMediaHost>>(BaseClass: Base) {
  class NativeHlsMediaStreamType extends (BaseClass as Constructor<NativeMediaHost>) {
    #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
    #isUserStreamType = false;
    #disconnect: AbortController | null = null;

    get streamType(): MediaStreamType {
      return this.#streamType;
    }

    set streamType(value: MediaStreamType) {
      if (value === MediaStreamTypes.UNKNOWN) {
        this.#isUserStreamType = false;
        this.#setDetected(this.#detect());
        return;
      }

      this.#isUserStreamType = true;
      this.#update(value);
    }

    attach(target: EventTarget): void {
      super.attach?.(target);
      this.#init(target as HTMLMediaElement);
    }

    detach(): void {
      this.#destroy();
      this.#setDetected(MediaStreamTypes.UNKNOWN);
      super.detach?.();
    }

    destroy(): void {
      this.#destroy();
      super.destroy?.();
    }

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
    }

    #init(target: HTMLMediaElement): void {
      this.#destroy();
      this.#disconnect = new AbortController();
      const { signal } = this.#disconnect;

      const detect = () => this.#setDetected(this.#detect(target));

      target.addEventListener('durationchange', detect, { signal });
      target.addEventListener('loadedmetadata', detect, { signal });
      target.addEventListener('emptied', () => this.#setDetected(MediaStreamTypes.UNKNOWN), { signal });

      detect();
    }

    #detect(target: HTMLMediaElement | null = this.target as HTMLMediaElement | null): MediaStreamType {
      if (!target) return MediaStreamTypes.UNKNOWN;
      const { duration } = target;
      if (duration === Infinity) return MediaStreamTypes.LIVE;
      if (Number.isFinite(duration) && duration > 0) return MediaStreamTypes.ON_DEMAND;
      return MediaStreamTypes.UNKNOWN;
    }

    #setDetected(value: MediaStreamType): void {
      if (this.#isUserStreamType) return;
      this.#update(value);
    }

    #update(value: MediaStreamType): void {
      if (this.#streamType === value) return;
      this.#streamType = value;
      this.dispatchEvent(new Event('streamtypechange'));
    }
  }

  return NativeHlsMediaStreamType as unknown as Base & Constructor<{ streamType: MediaStreamType }>;
}
