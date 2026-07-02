import type { Constructor } from '@videojs/utils/types';
import type { LevelLoadedData } from 'hls.js';
import Hls from 'hls.js';
import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import type { HlsEngineHost } from './types';

export function HlsJsMediaStreamTypeMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaStreamType extends (BaseClass as Constructor<HlsEngineHost>) {
    #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
    #isUserStreamType = false;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MANIFEST_LOADING, () => this.#setDetected(MediaStreamTypes.UNKNOWN));
      this.engine?.on(Hls.Events.DESTROYING, () => this.#setDetected(MediaStreamTypes.UNKNOWN));
      this.engine?.on(Hls.Events.LEVEL_LOADED, (_event: string, data: LevelLoadedData) => {
        this.#setDetected(data.details.live ? MediaStreamTypes.LIVE : MediaStreamTypes.ON_DEMAND);
      });
    }

    get streamType(): MediaStreamType {
      return this.#streamType;
    }

    set streamType(value: MediaStreamType) {
      if (value === MediaStreamTypes.UNKNOWN) {
        this.#isUserStreamType = false;
        this.#update(MediaStreamTypes.UNKNOWN);
        return;
      }

      this.#isUserStreamType = true;
      this.#update(value);
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

  return HlsJsMediaStreamType as unknown as Base & Constructor<{ streamType: MediaStreamType }>;
}
