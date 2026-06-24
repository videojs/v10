import { isWebKitAirPlayCapable, listen, type WebKitVideoElement } from '@videojs/utils/dom';
import { type Throttled, throttle } from '@videojs/utils/function';
import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';
import type { HlsEngineHost } from './types';

// See throttledLoad
const WIRELESS_BURST_MS = 100;

/**
 * Adds an AirPlay-capable fallback `<source>` to the attached video element so
 * Safari can hand the original HLS manifest off to AirPlay receivers while
 * local playback continues through hls.js (MSE).
 * When wireless-target changes, suspends hls.js loading so we don't double-fetch
 * alongside the AirPlay receiver.
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
     * WebKit fires `webkitcurrentplaybacktargetiswirelesschanged` several times in
     * a burst on the first AirPlay connect with values (`true → false → true`).
     * Without this the transient `false` mid-burst would `startLoad()`
     * against an MSE attachment that's being torn down for the handoff,
     * which hls.js surfaces as a fatal InvalidStateError.
     */
    #throttledLoad: Throttled<[]> | null = null;

    constructor(...args: any[]) {
      super(...args);

      this.engine?.on(Hls.Events.MEDIA_ATTACHED, () => this.#init());
      this.engine?.on(Hls.Events.MEDIA_DETACHED, () => this.#destroy());
      this.engine?.on(Hls.Events.DESTROYING, () => this.#destroy());
      this.engine?.on(Hls.Events.MANIFEST_LOADING, (_event, data) => {
        if (this.#sourceEl) this.#sourceEl.src = data.url;
      });
    }

    #init(): void {
      this.#destroy();

      const target = this.target;
      if (!target || !isWebKitAirPlayCapable(target)) return;

      // Counter the `disableRemotePlayback = true` that other code paths may
      // set for MSE; AirPlay requires the picker to be available on this
      // element.
      target.disableRemotePlayback = false;
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
        if (target.webkitCurrentPlaybackTargetIsWireless) {
          this.engine?.stopLoad();
        } else {
          this.engine?.startLoad();
        }
      };

      this.#throttledLoad = throttle(sync, WIRELESS_BURST_MS);

      this.#disconnect = new AbortController();
      listen(target as EventTarget, 'webkitcurrentplaybacktargetiswirelesschanged', this.#throttledLoad, {
        signal: this.#disconnect.signal,
      });

      // AirPlay may already be active at (re)attach.
      this.#throttledLoad();
    }

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#throttledLoad?.cancel();
      this.#throttledLoad = null;
      this.#sourceEl?.remove();
      this.#sourceEl = null;
    }
  }

  return HlsJsMediaAirPlay as unknown as Base;
}
