import Mux from 'mux-embed';
import { Hls, type HlsMedia } from '../hls';
import { getPlayerVersion } from './env';
import type { MuxDataOptions, MuxDataSdk } from './types';

export interface MuxDataProps {
  MuxDataSdk: MuxDataSdk | undefined;
  beaconCollectionDomain: string | undefined;
  debug: boolean;
  disableCookies: boolean;
  envKey: string | undefined;
  playerSoftwareName: string | undefined;
  playerSoftwareVersion: string | undefined;
  playerInitTime: number | undefined;
  metadata: MuxDataOptions['data'] | undefined;
}

const MUX_VIDEO_DOMAIN = 'mux.com';

export interface MuxDataMedia extends EventTarget {
  readonly engine?: HlsMedia['engine'];
  readonly src: string;
}

declare module '../media-host' {
  interface MediaComponentConfig {
    muxData: Partial<MuxDataProps>;
  }
}

export class MuxData implements MuxDataProps {
  static readonly configKey = 'muxData';

  #MuxDataSdk: MuxDataSdk | undefined = Mux;
  #pendingInitialize: Promise<void> | null = null;
  #beaconCollectionDomain: string | undefined;
  #debug = false;
  #disableCookies = false;
  #metadata: MuxDataOptions['data'] | undefined;
  #envKey: string | undefined;
  #playerSoftwareName: string | undefined;
  #playerSoftwareVersion: string | undefined = getPlayerVersion();
  #playerInitTime: number | undefined = this.#generatePlayerInitTime();
  #media: MuxDataMedia | null = null;
  #target: HTMLVideoElement | null = null;

  constructor(props: Partial<MuxDataProps> = {}) {
    Object.assign(this, props);
  }

  setMedia(media: MuxDataMedia) {
    this.#media = media;
    this.#media.addEventListener('loadstart', this.#reinitialize);
  }

  attach(target: HTMLVideoElement) {
    this.#target = target;
    this.#reinitialize();
  }

  detach() {
    if (this.#target?.mux) {
      this.#target.mux.destroy();
      delete this.#target.mux;
    }
    this.#target = null;
  }

  destroy() {
    this.#media?.removeEventListener('loadstart', this.#reinitialize);
    this.#media = null;
    this.#target = null;
  }

  get MuxDataSdk() {
    return this.#MuxDataSdk;
  }

  set MuxDataSdk(value) {
    if (this.#MuxDataSdk === value) return;
    this.#MuxDataSdk = value;
    this.#reinitialize();
  }

  get beaconCollectionDomain() {
    return this.#beaconCollectionDomain;
  }

  set beaconCollectionDomain(value) {
    if (this.#beaconCollectionDomain === value) return;
    this.#beaconCollectionDomain = value;
    this.#reinitialize();
  }

  get debug() {
    return this.#debug;
  }

  set debug(value) {
    if (this.#debug === value) return;
    this.#debug = value;
    this.#reinitialize();
  }

  get disableCookies() {
    return this.#disableCookies;
  }

  set disableCookies(value) {
    if (this.#disableCookies === value) return;
    this.#disableCookies = value;
    this.#reinitialize();
  }

  get envKey() {
    return this.#envKey;
  }

  set envKey(value) {
    if (this.#envKey === value) return;
    this.#envKey = value;
    this.#target?.mux?.updateData(value ? { env_key: value } : {});
  }

  get playerSoftwareName() {
    return this.#playerSoftwareName;
  }

  set playerSoftwareName(value) {
    if (this.#playerSoftwareName === value) return;
    this.#playerSoftwareName = value;
    this.#target?.mux?.updateData(value ? { player_software_name: value } : {});
  }

  get playerSoftwareVersion() {
    return this.#playerSoftwareVersion;
  }

  set playerSoftwareVersion(value) {
    if (this.#playerSoftwareVersion === value) return;
    this.#playerSoftwareVersion = value;
    this.#target?.mux?.updateData(value ? { player_software_version: value } : {});
  }

  get playerInitTime() {
    return this.#playerInitTime;
  }

  set playerInitTime(value) {
    if (this.#playerInitTime === value) return;
    this.#playerInitTime = value;
    this.#target?.mux?.updateData(value ? { player_init_time: value } : {});
  }

  get metadata() {
    return this.#metadata;
  }

  set metadata(value) {
    if (this.#metadata === value) return;
    this.#metadata = value;
    this.#target?.mux?.updateData(value ? { ...value } : {});
  }

  #reinitialize = () => {
    if (this.#target?.mux) {
      this.#target.mux.destroy();
      delete this.#target.mux;
    }
    this.#initialize();
  };

  async #initialize() {
    // Defer to ensure all properties are set before the Mux Data SDK is initialized.
    if (this.#pendingInitialize) return;
    await (this.#pendingInitialize = Promise.resolve());
    this.#pendingInitialize = null;

    const target = this.#target;
    const media = this.#media;

    if (!this.MuxDataSdk || !target || !media || (target.mux && !target.mux.deleted)) return;

    const {
      debug,
      beaconCollectionDomain,
      disableCookies,
      envKey: env_key,
      playerSoftwareName: player_software_name,
      playerSoftwareVersion: player_software_version,
      playerInitTime: player_init_time,
      metadata = {},
    } = this;
    const { engine: hlsjs } = media;

    const { view_session_id = this.MuxDataSdk?.utils.generateUUID() } = metadata;
    const video_id = toVideoId({ metadata, src: media.src });
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

export type MuxVideoIdProps = {
  src: string;
  metadata?: Record<string, any>;
};

export function toVideoId(props: MuxVideoIdProps): string | undefined {
  if (props.metadata?.video_id) return props.metadata.video_id;
  if (!isMuxVideoSrc(props)) return props.src;
  return toPlaybackIdFromSrc(props.src) ?? props.src;
}

export function toPlaybackIdFromSrc(src: string): string | undefined {
  if (!src || !src.startsWith('https://stream.')) return undefined;
  const [playbackId] = new URL(src).pathname.slice(1).split(/\.m3u8|\//);
  return playbackId || undefined;
}

export function isMuxVideoSrc({ src }: MuxVideoIdProps): boolean {
  if (typeof src !== 'string') return false;
  const base = window?.location.href;
  const hostname = new URL(src, base).hostname.toLocaleLowerCase();
  return hostname.includes(MUX_VIDEO_DOMAIN);
}
