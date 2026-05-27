/// <reference path="../../../../node_modules/mux-embed/dist/types/mux-embed.d.ts" preserve="true" />

import HlsJs from 'hls.js';
import Mux, { type Options as MuxDataOptions, type Mux as MuxDataSdk } from 'mux-embed';
import { installExtension, type MediaExtension } from '../../../core/media/media-extension';
import { addLayer } from '../../../core/media/media-layer';
import type { HTMLAudioElementHost } from '../html-audio-element-host';
import type { HTMLVideoElementHost } from '../html-video-element-host';
import { HTMLVideoElementLayer } from '../html-video-element-layer';
import { getPlayerVersion } from './env';

export type { MuxDataSdk, MuxDataOptions };
export type MuxDataMedia = HTMLVideoElementHost | HTMLAudioElementHost;

const MUX_VIDEO_DOMAIN = 'mux.com';

export interface MuxDataProps {
  /** Mux Data SDK module. Defaults to `mux-embed`. */
  MuxDataSdk?: MuxDataSdk | undefined;
  /** Override the Mux Data beacon collection domain. */
  beaconCollectionDomain?: string | undefined;
  /** Forward Mux SDK debug logs to the console. */
  debug?: boolean | undefined;
  /** Disable Mux SDK first-party cookies. */
  disableCookies?: boolean | undefined;
  /** Mux Data environment key. */
  envKey?: string | undefined;
  /** Initial Mux Data metadata payload. */
  metadata?: MuxDataOptions['data'] | undefined;
  /** Player software name. Falls back to the media class's static `PLAYER_SOFTWARE_NAME`. */
  playerSoftwareName?: string | undefined;
  /** Player software version. Defaults to the build's `__PLAYER_VERSION__`. */
  playerSoftwareVersion?: string | undefined;
  /** Player init time (ms). Captured from `MuxDataSdk.utils.now()` at construction when unset. */
  playerInitTime?: number | undefined;
}

/**
 * Mux Data extension. Attaches the Mux Data SDK to the host's underlying media
 * element on `load()` and tears it down on uninstall.
 *
 * @example
 * muxData({ envKey: 'env-1' }).install(media);
 */
class MuxData implements MuxDataProps, MediaExtension {
  #destroy: (() => void) | null = null;

  MuxDataSdk: MuxDataSdk | undefined = Mux;
  beaconCollectionDomain: string | undefined;
  debug = false;
  disableCookies = false;
  envKey: string | undefined;
  metadata: MuxDataOptions['data'] | undefined;
  playerSoftwareName: string | undefined;
  playerSoftwareVersion: string | undefined = getPlayerVersion();
  playerInitTime: number | undefined;

  constructor(props: MuxDataProps = {}) {
    Object.assign(this, props);
    this.playerInitTime ??= this.MuxDataSdk?.utils.now();
  }

  install(media: MuxDataMedia) {
    const uninstall = installExtension(muxData, media, this);

    this.playerSoftwareName ??= (media.constructor as { PLAYER_SOFTWARE_NAME?: string }).PLAYER_SOFTWARE_NAME;
    const removeLayer = addLayer(media, new MuxDataLayer(() => this.#initializeSdk(media)));

    this.#destroy = () => {
      uninstall();
      removeLayer();
      const { target } = media;
      if (target?.mux && !target.mux.deleted) {
        target.mux.destroy();
        delete target.mux;
      }
    };
  }

  destroy() {
    this.#destroy?.();
    this.#destroy = null;
  }

  #initializeSdk(media: MuxDataMedia) {
    const { target } = media;
    if (!this.MuxDataSdk || !target || (target.mux && !target.mux.deleted)) return;

    const metadata = { ...this.metadata };
    metadata.view_session_id ??= this.MuxDataSdk.utils.generateUUID();

    const video_id = toVideoId({ src: media.src, metadata: this.metadata });
    if (video_id) metadata.video_id = video_id;

    const { engine: hlsjs } = media;

    this.MuxDataSdk.monitor(target, {
      debug: this.debug,
      ...(this.beaconCollectionDomain ? { beaconCollectionDomain: this.beaconCollectionDomain } : {}),
      ...(this.disableCookies ? { disableCookies: this.disableCookies } : {}),
      ...(hlsjs ? { hlsjs } : {}),
      Hls: HlsJs,
      data: {
        ...(this.envKey ? { env_key: this.envKey } : {}),
        // Some Mux Data integrations key off `player_software_name` and others off `player_software`;
        // setting both avoids stability differences across SDK versions.
        ...(this.playerSoftwareName
          ? { player_software_name: this.playerSoftwareName, player_software: this.playerSoftwareName }
          : {}),
        ...(this.playerSoftwareVersion ? { player_software_version: this.playerSoftwareVersion } : {}),
        ...(this.playerInitTime ? { player_init_time: this.playerInitTime } : {}),
        ...metadata,
      },
    });
  }
}

export function muxData(props: MuxDataProps = {}) {
  return new MuxData(props);
}

/**
 * Wraps `load()` to install the Mux Data SDK after super-delegating (so engine
 * setup in lower layers can start) but before the underlying media element
 * fires `loadstart`. The SDK installs its own `loadstart` listener inside
 * `monitor()` and would otherwise miss the first event of every load.
 */
class MuxDataLayer extends HTMLVideoElementLayer {
  #initialize: () => void;

  constructor(initialize: () => void) {
    super();
    this.#initialize = initialize;
  }

  override async load() {
    await super.load();
    this.#initialize();
  }
}

export type MuxVideoIdProps = {
  src: string;
  metadata?: Record<string, any> | undefined;
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
