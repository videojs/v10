import { isWebKitAirPlayCapable, listen, type WebKitVideoElement } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';
import Hls from 'hls.js';
import type { HlsEngineHost } from './types';

// Internal channel for `HlsJsMedia` to hand the delegate bridge the author's
// `disableRemotePlayback` intent, kept off every class's public surface.
const authorPreference = new WeakMap<object, boolean>();

/** Record the author's `disableRemotePlayback` intent for a delegate's AirPlay bridge. */
export function setAuthorDisableRemotePlayback(delegate: object, disabled: boolean): void {
  authorPreference.set(delegate, disabled);
}

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

      // Counter the `disableRemotePlayback = true` hls.js sets for MMS; AirPlay
      // requires the picker on this element.
      if (!authorPreference.get(this)) {
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
