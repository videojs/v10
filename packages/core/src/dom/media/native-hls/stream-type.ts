import type { Constructor } from '@videojs/utils/types';
import type { NativeMediaHost } from './errors';
import { type StreamType, StreamTypes } from './index';

/**
 * Exposes a settable `streamType` (`'on-demand' | 'live' | 'unknown'`) on the
 * native HLS delegate. Auto-detects from the media element's `duration`:
 * `Infinity` → `'live'`, finite positive → `'on-demand'`. Resets to
 * `'unknown'` on `emptied` and on detach.
 *
 * Setting `streamType` to a concrete value (`'live'` / `'on-demand'`) pins
 * the value and suppresses auto-detection; setting `'unknown'` clears the
 * override and re-enables detection. Dispatches `streamtypechange` on the
 * host when the value actually changes.
 */
export function NativeHlsMediaStreamTypeMixin<Base extends Constructor<NativeMediaHost>>(BaseClass: Base) {
  class NativeHlsMediaStreamType extends (BaseClass as Constructor<NativeMediaHost>) {
    #streamType: StreamType = StreamTypes.UNKNOWN;
    #userSet = false;
    #disconnect: AbortController | null = null;

    get streamType(): StreamType {
      return this.#streamType;
    }

    set streamType(value: StreamType) {
      if (value === StreamTypes.UNKNOWN) {
        this.#userSet = false;
        this.#setDetected(this.#detect());
        return;
      }

      this.#userSet = true;
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
      if (this.#userSet) return;
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
