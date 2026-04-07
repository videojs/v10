import type { Constructor } from '@videojs/utils/types';
import Mux from 'mux-embed';

import { Hls, type HlsMediaDelegate } from '../hls';
import { getPlayerVersion } from './env';
import type { MuxDataOptions, MuxDataSdk } from './types';

const MUX_VIDEO_DOMAIN = 'mux.com';

export interface MuxDataMediaHost {
  readonly target: HTMLMediaElement | null;
  readonly debug: boolean;
  readonly engine: HlsMediaDelegate['engine'];
  attach(target: HTMLMediaElement): void;
  detach(): void;
  load(): void;
}

export function MuxDataMediaMixin<Base extends Constructor<MuxDataMediaHost>>(BaseClass: Base) {
  class MuxDataMedia extends BaseClass {
    #MuxDataSdk: MuxDataSdk | undefined = Mux;
    #MuxDataSdkInitializedBefore: boolean = false;
    #beaconCollectionDomain: MuxDataOptions['beaconCollectionDomain'] | undefined;
    #disableCookies: MuxDataOptions['disableCookies'] = false;
    #metadata: MuxDataOptions['data'] | undefined;
    #envKey: string | undefined;
    #playerSoftwareName: string | undefined = (this.constructor as { PLAYER_SOFTWARE_NAME?: string })
      .PLAYER_SOFTWARE_NAME;
    #playerSoftwareVersion: string | undefined = getPlayerVersion();
    #playerInitTime: number | undefined = this.#generatePlayerInitTime();

    get MuxDataSdk() {
      return this.#MuxDataSdk;
    }

    set MuxDataSdk(value) {
      this.#MuxDataSdk = value;
    }

    get beaconCollectionDomain(): string | undefined {
      return this.#beaconCollectionDomain;
    }

    set beaconCollectionDomain(value: string | undefined) {
      this.#beaconCollectionDomain = value;
    }

    get disableCookies(): MuxDataOptions['disableCookies'] {
      return this.#disableCookies;
    }

    set disableCookies(value: MuxDataOptions['disableCookies']) {
      this.#disableCookies = value;
    }

    get envKey(): string | undefined {
      return this.#envKey;
    }

    set envKey(value: string | undefined) {
      this.#envKey = value;
    }

    get playerSoftwareName(): string | undefined {
      return this.#playerSoftwareName;
    }

    set playerSoftwareName(value: string | undefined) {
      this.#playerSoftwareName = value;
    }

    get playerSoftwareVersion(): string | undefined {
      return this.#playerSoftwareVersion;
    }

    set playerSoftwareVersion(value: string | undefined) {
      this.#playerSoftwareVersion = value;
    }

    get playerInitTime(): number | undefined {
      return this.#playerInitTime;
    }

    set playerInitTime(value: number | undefined) {
      this.#playerInitTime = value;
    }

    get metadata(): MuxDataOptions['data'] | undefined {
      return this.#metadata;
    }

    set metadata(value: MuxDataOptions['data'] | undefined) {
      this.#metadata = value;
    }

    attach(target: HTMLMediaElement): void {
      super.attach(target);

      // Only initialize Mux Data SDK if it was already initialized before in attach;
      // the first initializeMuxDataSdk call should be done in the deferred load hook
      // so all the properties are set before the Mux Data SDK is initialized.
      if (this.#MuxDataSdkInitializedBefore) {
        this.#initializeMuxDataSdk();
      }
    }

    detach(): void {
      if (this.target?.mux) {
        this.target.mux.destroy();
        delete this.target.mux;
      }
      super.detach();
    }

    load(): void {
      super.load();
      this.#initializeMuxDataSdk();
    }

    #initializeMuxDataSdk(): void {
      const target = this.target as HTMLMediaElement;

      if (!this.MuxDataSdk || !target || (target.mux && !target.mux.deleted)) return;

      this.#MuxDataSdkInitializedBefore = true;

      const {
        debug,
        beaconCollectionDomain,
        disableCookies,
        engine: hlsjs,
        envKey: env_key,
        playerSoftwareName: player_software_name,
        playerSoftwareVersion: player_software_version,
        playerInitTime: player_init_time,
        metadata = {},
      } = this;

      const { view_session_id = this.MuxDataSdk?.utils.generateUUID() } = metadata;
      const video_id = toVideoId(this as unknown as MuxVideoIdProps);
      metadata.view_session_id = view_session_id;
      if (video_id) metadata.video_id = video_id;

      this.MuxDataSdk?.monitor(target, {
        debug,
        ...(beaconCollectionDomain ? { beaconCollectionDomain } : {}),
        ...(disableCookies ? { disableCookies } : {}),
        ...(hlsjs ? { hlsjs } : {}),
        Hls,
        data: {
          ...(env_key ? { env_key } : {}),
          ...(player_software_name ? { player_software_name } : {}),
          // NOTE: Adding this because there appears to be some instability on whether
          // player_software_name or player_software "wins" for Mux Data (CJP)
          ...(player_software_name ? { player_software: player_software_name } : {}),
          ...(player_software_version ? { player_software_version } : {}),
          ...(player_init_time ? { player_init_time } : {}),
          // Use any metadata passed in programmatically (which may override the defaults above)
          ...metadata,
        },
      });
    }

    #generatePlayerInitTime(): number | undefined {
      if (!this.MuxDataSdk) return undefined;
      return this.MuxDataSdk.utils.now();
    }
  }

  return MuxDataMedia as unknown as Base;
}

export type MuxVideoIdProps = {
  playbackId: string | null;
  src: string;
  customDomain: string;
  metadata?: Record<string, any>;
};

export function toVideoId(props: MuxVideoIdProps): string | undefined {
  if (props.metadata?.video_id) return props.metadata.video_id;
  if (!isMuxVideoSrc(props)) return props.src;
  return toPlaybackIdFromParameterized(props.playbackId) ?? toPlaybackIdFromSrc(props.src) ?? props.src;
}

function toPlaybackIdFromParameterized(playbackId: string | null): string | undefined {
  if (!playbackId) return undefined;
  const [id] = playbackId.split('?');
  return id || undefined;
}

export function toPlaybackIdFromSrc(src: string): string | undefined {
  if (!src || !src.startsWith('https://stream.')) return undefined;
  const [playbackId] = new URL(src).pathname.slice(1).split(/\.m3u8|\//);
  return playbackId || undefined;
}

export function isMuxVideoSrc({ playbackId, src, customDomain }: MuxVideoIdProps): boolean {
  if (playbackId) return true;
  if (typeof src !== 'string') return false;
  const base = window?.location.href;
  const hostname = new URL(src, base).hostname.toLocaleLowerCase();

  return hostname.includes(MUX_VIDEO_DOMAIN) || (!!customDomain && hostname.includes(customDomain.toLocaleLowerCase()));
}
