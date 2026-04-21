import type { Constructor } from '@videojs/utils/types';
import type { NativeMediaHost } from './errors';
import { type StreamType, StreamTypes } from './index';

export function NativeHlsMediaStreamTypeMixin<Base extends Constructor<NativeMediaHost>>(BaseClass: Base) {
  class NativeHlsMediaStreamType extends (BaseClass as Constructor<NativeMediaHost>) {
    #streamType: StreamType = StreamTypes.UNKNOWN;
    #isUserStreamType = false;
    #disconnect: AbortController | null = null;

    get streamType(): StreamType {
      return this.#streamType;
    }

    set streamType(value: StreamType) {
      if (value === StreamTypes.UNKNOWN) {
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
      this.#setDetected(StreamTypes.UNKNOWN);
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
      target.addEventListener('emptied', () => this.#setDetected(StreamTypes.UNKNOWN), { signal });

      detect();
    }

    #detect(target: HTMLMediaElement | null = this.target as HTMLMediaElement | null): StreamType {
      if (!target) return StreamTypes.UNKNOWN;
      const { duration } = target;
      if (duration === Infinity) return StreamTypes.LIVE;
      if (Number.isFinite(duration) && duration > 0) return StreamTypes.ON_DEMAND;
      return StreamTypes.UNKNOWN;
    }

    #setDetected(value: StreamType): void {
      if (this.#isUserStreamType) return;
      this.#update(value);
    }

    #update(value: StreamType): void {
      if (this.#streamType === value) return;
      this.#streamType = value;
      this.dispatchEvent(new Event('streamtypechange'));
    }
  }

  return NativeHlsMediaStreamType as unknown as Base & Constructor<{ streamType: StreamType }>;
}
