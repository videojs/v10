import type { Constructor } from '@videojs/utils/types';

import { type MediaStreamType, MediaStreamTypes } from '../../core/types';
import type { ShakaEngineHost } from './types';

export function ShakaMediaStreamTypeMixin<Base extends Constructor<ShakaEngineHost>>(BaseClass: Base) {
  class ShakaMediaStreamType extends (BaseClass as Constructor<ShakaEngineHost>) {
    #streamType: MediaStreamType = MediaStreamTypes.UNKNOWN;
    #isUserStreamType = false;

    constructor(...args: any[]) {
      super(...args);

      const { engine } = this;
      if (!engine) return;

      engine.addEventListener('loading', this.#forget);
      engine.addEventListener('unloading', this.#forget);
      engine.addEventListener('manifestparsed', this.#detect);
      engine.addEventListener('manifestupdated', this.#detect);
      // `src=` playback of a progressive file parses no manifest; `loaded` is
      // the one signal every load path fires.
      engine.addEventListener('loaded', this.#detect);
    }

    destroy() {
      const { engine } = this;

      engine?.removeEventListener('loading', this.#forget);
      engine?.removeEventListener('unloading', this.#forget);
      engine?.removeEventListener('manifestparsed', this.#detect);
      engine?.removeEventListener('manifestupdated', this.#detect);
      engine?.removeEventListener('loaded', this.#detect);

      super.destroy();
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

    #forget = () => this.#setDetected(MediaStreamTypes.UNKNOWN);

    #detect = () => {
      const { engine } = this;
      if (!engine) return;

      // An in-progress presentation — a live recording with a known end, like
      // an in-progress DASH recording — reads as not live to `isLive()` but
      // still grows its seekable window, so it is announced as live rather
      // than on-demand.
      const live = engine.isLive() || engine.isInProgress();

      this.#setDetected(live ? MediaStreamTypes.LIVE : MediaStreamTypes.ON_DEMAND);
    };

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

  return ShakaMediaStreamType as unknown as Base & Constructor<{ streamType: MediaStreamType }>;
}
