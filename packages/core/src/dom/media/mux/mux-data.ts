import type { Mixin } from '@videojs/utils/types';
import Mux from 'mux-embed';
import type { MediaEngineHost } from '../../../core/media/types';
import { Hls, type HlsMedia } from '../hls';
import { getPlayerVersion } from './env';
import type { MuxDataOptions, MuxDataSdk } from './types';

/** Props that configure Mux Data analytics integration. */
export interface MuxDataMediaProps {
  /** Mux Data SDK instance; pass to use a vendored build. */
  MuxDataSdk: MuxDataSdk | undefined;
  /** Override the beacon collection domain. */
  beaconCollectionDomain: string | undefined;
  /** Disable Mux Data cookies. */
  disableCookies: boolean;
  /** Mux environment key. */
  envKey: string | undefined;
  /** Reported player software name. */
  playerSoftwareName: string | undefined;
  /** Reported player software version. */
  playerSoftwareVersion: string | undefined;
  /** Initialization timestamp reported to Mux Data. */
  playerInitTime: number | undefined;
  /** Additional view metadata. */
  metadata: MuxDataOptions['data'] | undefined;
}

/** Defaults for {@link MuxDataMediaProps}. */
export const muxDataMediaDefaultProps: MuxDataMediaProps = {
  MuxDataSdk: undefined,
  beaconCollectionDomain: undefined,
  disableCookies: false,
  envKey: undefined,
  playerSoftwareName: undefined,
  playerSoftwareVersion: undefined,
  playerInitTime: undefined,
  metadata: undefined,
};

const MUX_VIDEO_DOMAIN = 'mux.com';

/** Host contract consumed by the Mux Data mixin. */
export interface MuxDataMediaHost extends MediaEngineHost<HlsMedia['engine'], HTMLMediaElement> {
  /** Engine debug flag. */
  readonly debug: boolean;
  /** Attach to a render target. */
  attach(target: HTMLMediaElement): void;
  /** Detach from the current target. */
  detach(): void;
  /** Trigger the engine load lifecycle. */
  load(): void;
}

/** Mixin that wires Mux Data analytics into a media adapter. */
export const MuxDataMediaMixin: Mixin<MuxDataMediaHost, MuxDataMediaProps> = (BaseClass) => {
  class MuxDataMedia extends BaseClass {
    #MuxDataSdk: MuxDataSdk | undefined = Mux;
    #MuxDataSdkInitializedBefore = false;
    #beaconCollectionDomain: string | undefined;
    #disableCookies = false;
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

    get beaconCollectionDomain() {
      return this.#beaconCollectionDomain;
    }

    set beaconCollectionDomain(value) {
      this.#beaconCollectionDomain = value;
    }

    get disableCookies() {
      return this.#disableCookies;
    }

    set disableCookies(value) {
      this.#disableCookies = value;
    }

    get envKey() {
      return this.#envKey;
    }

    set envKey(value) {
      this.#envKey = value;
    }

    get playerSoftwareName() {
      return this.#playerSoftwareName;
    }

    set playerSoftwareName(value) {
      this.#playerSoftwareName = value;
    }

    get playerSoftwareVersion() {
      return this.#playerSoftwareVersion;
    }

    set playerSoftwareVersion(value) {
      this.#playerSoftwareVersion = value;
    }

    get playerInitTime() {
      return this.#playerInitTime;
    }

    set playerInitTime(value) {
      this.#playerInitTime = value;
    }

    get metadata() {
      return this.#metadata;
    }

    set metadata(value) {
      this.#metadata = value;
    }

    attach(target: HTMLMediaElement) {
      super.attach(target);

      // Only initialize Mux Data SDK if it was already initialized before in attach;
      // the first initializeMuxDataSdk call should be done in the deferred load hook
      // so all the properties are set before the Mux Data SDK is initialized.
      if (this.#MuxDataSdkInitializedBefore) {
        this.#initializeMuxDataSdk();
      }
    }

    detach() {
      if (this.target?.mux) {
        this.target.mux.destroy();
        delete this.target.mux;
      }
      super.detach();
    }

    load() {
      super.load();
      this.#initializeMuxDataSdk();
    }

    #initializeMuxDataSdk() {
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

    #generatePlayerInitTime() {
      if (!this.MuxDataSdk) return undefined;
      return this.MuxDataSdk.utils.now();
    }
  }

  return MuxDataMedia as any;
};

/** Subset of Mux Video props used to derive a `video_id`. */
export type MuxVideoIdProps = {
  /** Source URL. */
  src: string;
  /** Optional metadata, which may override the derived ID. */
  metadata?: Record<string, any>;
};

/**
 * Derive the Mux Data `video_id` for a source, preferring explicit metadata, then the Mux playback ID.
 *
 * @param props - Source URL and optional metadata.
 */
export function toVideoId(props: MuxVideoIdProps): string | undefined {
  if (props.metadata?.video_id) return props.metadata.video_id;
  if (!isMuxVideoSrc(props)) return props.src;
  return toPlaybackIdFromSrc(props.src) ?? props.src;
}

/**
 * Extract the Mux playback ID from a `stream.mux.com` URL, or `undefined` when not a Mux URL.
 *
 * @param src - Source URL.
 */
export function toPlaybackIdFromSrc(src: string): string | undefined {
  if (!src || !src.startsWith('https://stream.')) return undefined;
  const [playbackId] = new URL(src).pathname.slice(1).split(/\.m3u8|\//);
  return playbackId || undefined;
}

/**
 * Whether the source URL points at a Mux Video host (`*.mux.com`).
 *
 * @param props - Object with a `src` URL string.
 */
export function isMuxVideoSrc({ src }: MuxVideoIdProps): boolean {
  if (typeof src !== 'string') return false;
  const base = window?.location.href;
  const hostname = new URL(src, base).hostname.toLocaleLowerCase();
  return hostname.includes(MUX_VIDEO_DOMAIN);
}
