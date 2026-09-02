// `mux-embed` publishes no `types`, so its declarations are pulled in by path for this implementation alone. Nothing
// exported from here names them: the public types below spell out the shapes Mux Data relies on, and the declaration
// emit drops the directive, so consumers typecheck against this module without `mux-embed`'s types in reach.
/// <reference path="../../../node_modules/mux-embed/dist/types/mux-embed.d.ts" />
import Mux from 'mux-embed';

import { getPlayerVersion } from './env';
import { type MuxDataEngineOptions, toMuxDataEngineOptions } from './mux-data-engine';

/**
 * Metadata reported with a Mux Data view, keyed the way the beacons spell it.
 *
 * The keys named here are the ones Mux Data reads or fills in itself; any other key the Mux Data SDK documents is
 * accepted alongside them.
 *
 * @see https://docs.mux.com/guides/data/make-your-data-actionable-with-metadata
 */
export interface MuxDataMetadata {
  /** Mux Data environment key. Filled in from {@link MuxDataProps.envKey}. */
  env_key?: string;
  /** Identifies the video within the environment. Derived from the source when omitted; see {@link toVideoId}. */
  video_id?: string;
  /** Groups the views of one player into a session. Generated once per {@link MuxData} when omitted. */
  view_session_id?: string;
  player_software_name?: string;
  player_software?: string;
  player_software_version?: string;
  player_init_time?: number;
  [key: string]: string | number | boolean | undefined;
}

/** The `mux-embed` monitor options Mux Data passes: element-level settings, engine hooks, and the view's metadata. */
export interface MuxDataMonitorOptions extends MuxDataEngineOptions {
  debug?: boolean;
  beaconCollectionDomain?: string;
  disableCookies?: boolean;
  data?: MuxDataMetadata;
}

/**
 * What Mux Data needs from the SDK it monitors with: the surface of `mux-embed` this integration calls. The bundled SDK
 * is the default; a page that loads its own passes that instead.
 */
export interface MuxDataSdk {
  /** Start monitoring a media element, installing the SDK's monitor handle on it. */
  monitor(target: HTMLMediaElement, options?: MuxDataMonitorOptions): void;
  utils: {
    generateUUID(): string;
    now(): number;
  };
}

export interface MuxDataProps {
  /** The Mux Data SDK to monitor with. `undefined` turns monitoring off. */
  MuxDataSdk: MuxDataSdk | undefined;
  beaconCollectionDomain: string | undefined;
  debug: boolean;
  disableCookies: boolean;
  envKey: string | undefined;
  playerSoftwareName: string | undefined;
  playerSoftwareVersion: string | undefined;
  playerInitTime: number | undefined;
  metadata: MuxDataMetadata | undefined;
}

export const muxDataDefaultProps: MuxDataProps = {
  MuxDataSdk: Mux,
  beaconCollectionDomain: undefined,
  debug: false,
  disableCookies: false,
  envKey: undefined,
  playerSoftwareName: undefined,
  playerSoftwareVersion: getPlayerVersion(),
  // Generated per instance; see `#generatePlayerInitTime()`.
  playerInitTime: undefined,
  metadata: undefined,
};

const MUX_VIDEO_DOMAIN = 'mux.com';

/** The SDK's monitor handle on a video element, narrowed to a live (non-destroyed) one. */
type LiveMuxMonitor = Extract<NonNullable<HTMLVideoElement['mux']>, { deleted: false }>;

/**
 * What Mux Data needs from the media it monitors: the source being played, a `loadstart` hinting that the source or
 * engine may have changed, and — for engine-backed playback — the engine itself. Redundant hints are free — Mux Data
 * reacts only to what actually changed — so medias can fire `loadstart` as often as their flavor requires.
 *
 * `engine` is deliberately untyped. Every engine-backed media host exposes one, but they are unrelated types (an hls.js
 * instance, a dash.js player, an SPF composition), and which of them Mux Data can hook is decided by
 * {@link toMuxDataEngineOptions}, not by this contract. Media with no JS engine simply omit it.
 */
export interface MuxDataMedia extends EventTarget {
  readonly engine?: unknown;
  readonly src: string;
}

export class MuxData implements MuxDataProps {
  #MuxDataSdk: MuxDataSdk | undefined = muxDataDefaultProps.MuxDataSdk;
  #pendingSync: Promise<void> | null = null;
  #beaconCollectionDomain: string | undefined = muxDataDefaultProps.beaconCollectionDomain;
  #debug = muxDataDefaultProps.debug;
  #disableCookies = muxDataDefaultProps.disableCookies;
  #metadata: MuxDataMetadata | undefined = muxDataDefaultProps.metadata;
  #envKey: string | undefined = muxDataDefaultProps.envKey;
  #playerSoftwareName: string | undefined = muxDataDefaultProps.playerSoftwareName;
  #playerSoftwareVersion: string | undefined = muxDataDefaultProps.playerSoftwareVersion;
  #playerInitTime: number | undefined = this.#generatePlayerInitTime();
  #media: MuxDataMedia | null = null;
  #target: HTMLVideoElement | null = null;
  // What the live monitor currently reflects, so a sync can react only to what changed.
  #monitoredSrc: string | null = null;
  #monitoredEngine: MuxDataMedia['engine'] = null;
  #engineHook: 'hlsjs' | 'dashjs' | null = null;
  // Generated once per instance, so the views of one player group into one session.
  #viewSessionId: string | undefined;

  constructor(props: Partial<MuxDataProps> = {}) {
    Object.assign(this, props);
  }

  setMedia(media: MuxDataMedia) {
    if (this.#media === media) return;

    this.#media?.removeEventListener('loadstart', this.#syncMonitor);
    this.#media = media;
    this.#media.addEventListener('loadstart', this.#syncMonitor);

    this.#syncMonitor();
  }

  attach(target: HTMLVideoElement) {
    if (this.#target === target) return;

    this.#destroyMonitor();
    this.#target = target;
    this.#syncMonitor();
  }

  detach() {
    this.#destroyMonitor();
    this.#target = null;
  }

  destroy() {
    this.detach();
    this.#media?.removeEventListener('loadstart', this.#syncMonitor);
    this.#media = null;
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

  /**
   * Mux Data environment key. Omitted from the beacon when unset, which is the norm for Mux-hosted playback: the view
   * reports the Mux playback ID as its `video_id` (see {@link toVideoId}) and Mux attributes it to the owning
   * environment. Set this to monitor sources Mux doesn't host.
   */
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

  #destroyMonitor() {
    if (this.#target?.mux) {
      this.#target.mux.destroy();
      delete this.#target.mux;
    }

    this.#monitoredSrc = null;
    this.#monitoredEngine = null;
    this.#engineHook = null;
  }

  /**
   * Full re-monitor, reserved for options that are baked into `monitor()` itself (the SDK, beacon routing, debug,
   * cookies). Source and engine changes go through {@link #syncMonitor} instead, which keeps the monitor — and its view
   * — alive.
   */
  #reinitialize = () => {
    this.#destroyMonitor();
    this.#syncMonitor();
  };

  /**
   * Reconcile the monitor with the media's current state. Called on every `loadstart`, but the event is only a hint:
   * the media's `src` and `engine` are compared against what the monitor already reflects, so a same-video `load()`
   * (remote playback engaging, an engine rebuild, a MediaSource re-attach) is a no-op, a video change becomes a
   * `videochange` on the live monitor, and only a missing monitor starts a new one.
   */
  #syncMonitor = () => {
    void this.#sync();
  };

  async #sync() {
    // Defer to coalesce bursts and to ensure all properties are set before the Mux Data SDK is initialized.
    if (this.#pendingSync) return;

    await (this.#pendingSync = Promise.resolve());
    this.#pendingSync = null;

    const target = this.#target;
    const media = this.#media;
    if (!this.MuxDataSdk || !target || !media) return;

    const mux = target.mux;

    if (!mux || mux.deleted) {
      this.#monitor(target, media);
      return;
    }

    this.#syncEngineHook(mux, media.engine);

    const src = media.src;
    if (src === this.#monitoredSrc) return;

    // A cleared source isn't a new video (the element's own events wind the view down), and it isn't tracked: the
    // video that loads next is still compared against the last video the monitor was told about.
    if (!src) return;

    const isFirstSource = !this.#monitoredSrc;

    this.#monitoredSrc = src;

    // A monitor started before the first source has its pending view: name the video rather than change it.
    if (isFirstSource) {
      mux.updateData(this.#videoData(media));
      return;
    }

    mux.emit('videochange', this.#videoData(media));
  }

  /** Keep engine telemetry hooked to the engine actually playing, without restarting the monitor. */
  #syncEngineHook(mux: LiveMuxMonitor, engine: MuxDataMedia['engine']) {
    if (engine === this.#monitoredEngine) return;

    if (this.#engineHook === 'hlsjs') mux.removeHLSJS();

    if (this.#engineHook === 'dashjs') mux.removeDashJS();

    const options = toMuxDataEngineOptions(engine);

    if (options.hlsjs && options.Hls) mux.addHLSJS({ hlsjs: options.hlsjs, Hls: options.Hls });

    if (options.dashjs) mux.addDashJS({ dashjs: options.dashjs });

    this.#trackEngine(engine, options);
  }

  /** Record which engine the monitor reflects and which telemetry hook carries it. */
  #trackEngine(engine: MuxDataMedia['engine'], options: MuxDataEngineOptions) {
    this.#monitoredEngine = engine ?? null;
    this.#engineHook = options.hlsjs ? 'hlsjs' : options.dashjs ? 'dashjs' : null;
  }

  #monitor(target: HTMLVideoElement, media: MuxDataMedia) {
    const {
      debug,
      beaconCollectionDomain,
      disableCookies,
      envKey: env_key,
      playerSoftwareName: player_software_name,
      playerSoftwareVersion: player_software_version,
      playerInitTime: player_init_time,
    } = this;

    const engineOptions = toMuxDataEngineOptions(media.engine);

    this.#monitoredSrc = media.src;
    this.#trackEngine(media.engine, engineOptions);

    this.MuxDataSdk?.monitor(target, {
      debug,
      ...(beaconCollectionDomain ? { beaconCollectionDomain } : {}),
      ...(disableCookies ? { disableCookies } : {}),
      ...engineOptions,
      data: {
        ...(env_key ? { env_key } : {}),
        ...(player_software_name ? { player_software_name } : {}),
        // NOTE: Adding this because there appears to be some instability on whether
        // player_software_name or player_software "wins" for Mux Data (CJP)
        ...(player_software_name ? { player_software: player_software_name } : {}),
        ...(player_software_version ? { player_software_version } : {}),
        ...(player_init_time ? { player_init_time } : {}),
        ...this.#videoData(media),
      },
    });
  }

  /**
   * The video-scoped beacon data: the session id, the derived `video_id`, and the caller's metadata, which may override
   * both. Built fresh per use — the caller's `metadata` object is never mutated.
   */
  #videoData(media: MuxDataMedia) {
    const metadata = this.metadata ?? {};
    const view_session_id = metadata.view_session_id ?? (this.#viewSessionId ??= this.MuxDataSdk?.utils.generateUUID());
    const video_id = toVideoId({ metadata, src: media.src });

    const derived: MuxDataMetadata = {};

    if (view_session_id) derived.view_session_id = view_session_id;

    if (video_id) derived.video_id = video_id;

    // Any metadata passed in programmatically may override the derived defaults above.
    return { ...derived, ...metadata };
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
  if (!src?.startsWith('https://stream.')) return undefined;

  const [playbackId] = new URL(src).pathname.slice(1).split(/\.m3u8|\//);

  return playbackId || undefined;
}

export function isMuxVideoSrc({ src }: MuxVideoIdProps): boolean {
  if (typeof src !== 'string') return false;

  const base = window?.location.href;
  const hostname = new URL(src, base).hostname.toLocaleLowerCase();

  return hostname.includes(MUX_VIDEO_DOMAIN);
}
