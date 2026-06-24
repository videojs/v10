import { isWebKitAirPlayCapable, listen, type WebKitVideoElement } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';
import type { HlsEngineHost } from './types';

/**
 * Add an AirPlay-capable fallback `<source>` to the attached video element so
 * Safari can hand the original HLS manifest off to AirPlay receivers while
 * local playback continues through hls.js (MSE). When wireless-target changes,
 * suspends hls.js loading so we don't double-fetch alongside the
 * remote pipeline.
 *
 * Implements the WebKit-recommended dual-source pattern:
 * https://webkit.org/blog/15036/how-to-use-media-source-extensions-with-airplay/
 *
 * No-op on non-WebKit platforms (Chromium, Firefox).
 */
export function HlsJsMediaAirPlayMixin<Base extends Constructor<HlsEngineHost>>(BaseClass: Base) {
  class HlsJsMediaAirPlay extends (BaseClass as Constructor<HlsEngineHost>) {
    #sourceEl: HTMLSourceElement | null = null;
    #disconnect: AbortController | null = null;

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

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#sourceEl?.remove();
      this.#sourceEl = null;
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
          // this.engine?.startLoad();
          // TODO: Calling startLoad here causes an hls.js error, anyway works well in Mac without it
          // I believe it relates to this event being triggered extra times
          // on first time switching over to airplay. Listing the cases for future ref
          // When player is created, regardless of airplay state: (false) | After playing, if airplay was connected will switch to true - good
          // When connecting the first time: (true -> false -> true)
          // Disconnecting: (false) - good
          // Reconnecting: (true) - good
        }
      };

      this.#disconnect = new AbortController();
      listen(target as EventTarget, 'webkitcurrentplaybacktargetiswirelesschanged', sync, {
        signal: this.#disconnect.signal,
      });

      // AirPlay may already be active when the element was (re)attached.
      sync();
    }
  }

  return HlsJsMediaAirPlay as unknown as Base;
}
