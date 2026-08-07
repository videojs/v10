import { isWebKitAirPlayCapable } from '@videojs/utils/dom';
import type { Constructor } from '@videojs/utils/types';

import { MediaError } from '../../core/media-error';
import type { NativeMediaHost } from './errors';
import {
  createDrmError,
  FAIRPLAY_KEY_SYSTEM,
  type FairPlayContext,
  type FairPlayKeySystem,
  NativeHlsDrmErrors,
  NativeHlsDrmMessages,
  type NativeHlsDrmSystemConfig,
  type NativeHlsDrmSystemsConfig,
} from './fairplay';
import { createFairPlayEme } from './fairplay-eme';
import { createFairPlayWebKit } from './fairplay-webkit';

/**
 * What the mixin needs from whatever it is composed onto: the DRM half of the
 * source, and somewhere to put an error the media element never reports.
 */
export type NativeHlsDrmHost = NativeMediaHost & {
  readonly source: { nativeHls?: { drmSystems?: NativeHlsDrmSystemsConfig | undefined } | undefined } | null;
  setError(error: MediaError): void;
};

/**
 * Play DRM-protected HLS natively, configured by `source.nativeHls.drmSystems`.
 *
 * Native HLS has no JS engine to hand key exchange to, so this mixin does it
 * against the media element directly: it answers the element's key requests by
 * fetching an application certificate and trading the CDM's SPC for a CKC at
 * the license server. Only FairPlay is reachable this way — Widevine and
 * PlayReady content needs the hls.js (MSE) engine.
 *
 * The configuration is read when a key request arrives rather than up front,
 * so assigning `source` and letting the element load are independent; state is
 * released on `emptied`, when the element starts on a new resource.
 *
 * Encrypted content with nothing configured fails loudly. Safari otherwise
 * stalls without explanation, which is indistinguishable from a slow network.
 */
export function NativeHlsMediaDrmMixin<Base extends Constructor<NativeHlsDrmHost>>(BaseClass: Base) {
  class NativeHlsMediaDrm extends (BaseClass as Constructor<NativeHlsDrmHost>) {
    #disconnect: AbortController | null = null;
    #active: { keySystem: FairPlayKeySystem; disconnect: AbortController } | null = null;
    #useWebKit = false;

    attach(target: HTMLVideoElement): void {
      super.attach(target);
      this.#init(target);
    }

    detach(): void {
      this.#destroy();
      super.detach?.();
    }

    destroy(): void {
      this.#destroy();
      super.destroy?.();
    }

    #destroy(): void {
      this.#disconnect?.abort();
      this.#disconnect = null;
      this.#useWebKit = false;
      void this.#reset();
    }

    #init(target: HTMLVideoElement): void {
      this.#destroy();
      this.#disconnect = new AbortController();
      const { signal } = this.#disconnect;

      // Both events are always observed, and each is served only by the
      // implementation that owns it — Safari can fire both, and only one of
      // them describes the keys the active CDM is holding.
      target.addEventListener('encrypted', (event) => this.#serve(event as MediaEncryptedEvent, false), { signal });
      target.addEventListener('webkitneedkey', (event) => this.#serve(event as MediaEncryptedEvent, true), { signal });

      // Fired when the element starts on a new resource, so the keys and
      // sessions held for the previous one are no longer good for anything.
      target.addEventListener('emptied', () => void this.#reset(), { signal });

      if (isWebKitAirPlayCapable(target)) {
        // A new receiver needs a new session, and EME is worth preferring
        // again the moment playback comes back to this device.
        target.addEventListener(
          'webkitcurrentplaybacktargetiswirelesschanged',
          () => {
            this.#useWebKit = false;
            void this.#reset();
          },
          { signal }
        );
      }
    }

    #serve(event: MediaEncryptedEvent, fromWebKit: boolean): void {
      if (fromWebKit !== this.#useWebKit) return;

      const media = this.target as HTMLVideoElement | null;
      const drmSystems = this.source?.nativeHls?.drmSystems;
      const config = drmSystems?.[FAIRPLAY_KEY_SYSTEM];
      if (!media) return;

      if (!config?.licenseUrl) {
        if (__DEV__ && drmSystems && Object.keys(drmSystems).length > 0) {
          // Sharing one `drmSystems` object with hls.js is the point of the
          // shape, so a config naming only the systems MSE reaches is an easy
          // mistake to make and looks configured from the outside.
          console.warn(
            `[vjs-drm] Native HLS negotiates FairPlay only, and \`source.nativeHls.drmSystems\` names no \`${FAIRPLAY_KEY_SYSTEM}\` license server.`
          );
        }

        this.setError(
          createDrmError(NativeHlsDrmMessages.MISSING_CONFIGURATION, NativeHlsDrmErrors.MISSING_CONFIGURATION)
        );
        return;
      }

      const active = (this.#active ??= this.#createKeySystem(media, config));

      void active.keySystem.request(event).catch((cause) => {
        // What raised this has since been torn down, so it is about a source
        // that is no longer playing.
        if (active.disconnect.signal.aborted) return;
        this.setError(
          cause instanceof MediaError
            ? cause
            : createDrmError(NativeHlsDrmMessages.CDM_ERROR, NativeHlsDrmErrors.CDM_ERROR)
        );
      });
    }

    #createKeySystem(media: HTMLVideoElement, config: NativeHlsDrmSystemConfig) {
      const disconnect = new AbortController();

      const context: FairPlayContext = {
        media,
        config,
        signal: disconnect.signal,
        reportError: (error) => this.setError(error),
      };

      const keySystem = this.#useWebKit
        ? createFairPlayWebKit(context)
        : createFairPlayEme(context, { onUnsupported: () => void this.#fallBackToWebKit(media) });

      return { keySystem, disconnect };
    }

    #reset(): Promise<void> {
      const active = this.#active;
      this.#active = null;

      active?.disconnect.abort();
      return active?.keySystem.close() ?? Promise.resolve();
    }

    async #fallBackToWebKit(media: HTMLVideoElement): Promise<void> {
      if (this.#useWebKit) return;
      this.#useWebKit = true;

      // EME has to release the element's media keys before the legacy API can
      // claim them, so the switch waits for teardown to finish.
      await this.#reset();
      if (!this.#disconnect || this.#disconnect.signal.aborted) return;

      // WebKit does not re-issue the key request the EME session failed on, so
      // the resource is reloaded to have it delivered to the legacy listener.
      // Playback restarts; the AirPlay handoff that got us here is already an
      // interruption.
      media.load();
    }
  }

  return NativeHlsMediaDrm as unknown as Base;
}
