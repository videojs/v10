import { isWebKitAirPlayCapable, listen, type WebKitVideoElement } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';

import type { HlsEngineHost } from './types';

/**
 * Adds an AirPlay-capable fallback `<source>` to the attached video element so Safari can hand the original HLS
 * manifest off to AirPlay receivers while local playback continues through hls.js (MSE). When wireless-target changes,
 * suspends hls.js loading so we don't double-fetch alongside the AirPlay receiver.
 *
 * Implements the WebKit-recommended pattern:
 * https://webkit.org/blog/15036/how-to-use-media-source-extensions-with-airplay/
 *
 * No-op on non-WebKit platforms (Chromium, Firefox).
 */
export function HlsJsMediaAirPlayMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaAirPlay extends (BaseClass as Constructor<HlsEngineHost>) {
    #sourceEl: HTMLSourceElement | null = null;
    #disconnect: AbortController | null = null;
    /**
     * The author's `disableRemotePlayback`, not the element's current value. Tracked because engines (hls.js or SPF)
     * may alter the value internally (forced on for ManagedMediaSource), so the element on its own cannot tell an
     * opt-out apart from an MMS requirement.
     */
    #authorDisableRemotePlayback = false;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MEDIA_ATTACHED, () => this.#init());
      this.engine?.on(Hls.Events.MEDIA_DETACHED, () => this.#destroy());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#destroy());
      this.engine?.on(Hls.Events.MANIFEST_LOADING, (_event, data) => {
        if (this.#sourceEl) this.#sourceEl.src = data.url;
      });
    }

    override get disableRemotePlayback(): boolean {
      return super.disableRemotePlayback;
    }

    override set disableRemotePlayback(value: boolean) {
      const changed = value !== this.#authorDisableRemotePlayback;

      this.#authorDisableRemotePlayback = value;
      super.disableRemotePlayback = value;

      // We need to re initialize with the new value so WebKit reconsiders the source.
      if (changed && this.#sourceEl) this.#init();
    }

    #init(): void {
      this.#destroy();

      const target = this.target;
      if (!target || !isWebKitAirPlayCapable(target)) return;

      // Only toggle this if the author did not explicitly turn it off.
      if (!this.#authorDisableRemotePlayback) {
        target.disableRemotePlayback = false;
      }

      this.#attachSource(target);
      this.#setupLoadControl(target);
    }

    #attachSource(target: WebKitVideoElement) {
      this.#sourceEl = document.createElement('source');
      this.#sourceEl.type = 'application/x-mpegURL';
      this.#sourceEl.src = this.engine?.url ?? '';
      target.append(this.#sourceEl);
    }

    #setupLoadControl(target: WebKitVideoElement) {
      const sync = () => {
        /*
         * From HLS.loadStart "Depending on default config,
         * client starts loading automatically when a source is set."
         * Safari re-sets the source when we turn AirPlay off, so there
         * is no need to call start load here when current playback
         * target is not wireless.
         */
        if (target.webkitCurrentPlaybackTargetIsWireless) {
          this.engine?.stopLoad();
        }
      };

      this.#disconnect = new AbortController();
      listen(target as EventTarget, 'webkitcurrentplaybacktargetiswirelesschanged', sync, {
        signal: this.#disconnect.signal,
      });

      // AirPlay may already be active at (re)attach.
      sync();
    }

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#sourceEl?.remove();
      this.#sourceEl = null;
    }
  }

  return HlsJsMediaAirPlay as unknown as Base;
}
