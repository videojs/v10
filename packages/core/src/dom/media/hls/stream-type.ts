import type { Constructor } from '@videojs/utils/types';
import type { LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';
import { type StreamType, StreamTypes } from './index';
import type { HlsEngineHost } from './types';

/**
 * Exposes a settable `streamType` (`'on-demand' | 'live' | 'unknown'`) on the
 * hls.js delegate. Auto-detects from `LEVEL_LOADED` (`details.live`) and
 * resets to `'unknown'` on `MANIFEST_LOADING` / `DESTROYING`.
 *
 * Setting `streamType` to a concrete value (`'live'` / `'on-demand'`) pins
 * the value and suppresses auto-detection; setting `'unknown'` clears the
 * override and re-enables detection. Dispatches `streamtypechange` on the
 * host when the value actually changes.
 */
export function HlsJsMediaStreamTypeMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaStreamType extends (BaseClass as Constructor<HlsEngineHost>) {
    #streamType: StreamType = StreamTypes.UNKNOWN;
    #userSet = false;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#setDetected(StreamTypes.UNKNOWN));
      this.engine?.on(Hls.Events.DESTROYING, () => this.#setDetected(StreamTypes.UNKNOWN));
      this.engine?.on(Hls.Events.LEVEL_LOADED, (_event: string, data: LevelLoadedData) => {
        this.#setDetected(data.details.live ? StreamTypes.LIVE : StreamTypes.ON_DEMAND);
      });
    }

    get streamType(): StreamType {
      return this.#streamType;
    }

    set streamType(value: StreamType) {
      if (value === StreamTypes.UNKNOWN) {
        this.#userSet = false;
        this.#update(StreamTypes.UNKNOWN);
        return;
      }

      this.#userSet = true;
      this.#update(value);
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

  return HlsJsMediaStreamType as unknown as Base & Constructor<{ streamType: StreamType }>;
}
