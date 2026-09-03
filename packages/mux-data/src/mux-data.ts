import { isEngineAdapter } from '@videojs/media';
import type { AnyHTMLMediaAdapter } from '@videojs/media/dom';
import Mux from 'mux-embed';

import { getPlayerVersion } from './env';
import { type MuxDataEngineOptions, toMuxDataEngineOptions } from './mux-data-engine';
import type { MuxDataOptions, MuxDataSdk } from './types';

export interface MuxDataExtensionProps {
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

/** The SDK's monitor handle on a video element, narrowed to a live (non-destroyed) one. */
type LiveMuxMonitor = Extract<NonNullable<HTMLVideoElement['mux']>, { deleted: false }>;

/**
 * The JS engine behind `adapter`, if it fronts one. Engines are unrelated types (an hls.js instance, a dash.js player,
 * an SPF composition); which of them Mux Data can hook is decided by {@link toMuxDataEngineOptions}, not here.
 */
function engineOf(adapter: AnyHTMLMediaAdapter): unknown {
  return isEngineAdapter(adapter) ? adapter.engine : null;
}

export class MuxDataExtension implements MuxDataExtensionProps {
  static readonly defaultProps: MuxDataExtensionProps = {
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

  #MuxDataSdk: MuxDataSdk | undefined = MuxDataExtension.defaultProps.MuxDataSdk;
  #pendingSync: Promise<void> | null = null;
  #beaconCollectionDomain: string | undefined = MuxDataExtension.defaultProps.beaconCollectionDomain;
  #debug = MuxDataExtension.defaultProps.debug;
  #disableCookies = MuxDataExtension.defaultProps.disableCookies;
  #metadata: MuxDataOptions['data'] | undefined = MuxDataExtension.defaultProps.metadata;
  #envKey: string | undefined = MuxDataExtension.defaultProps.envKey;
  #playerSoftwareName: string | undefined = MuxDataExtension.defaultProps.playerSoftwareName;
  #playerSoftwareVersion: string | undefined = MuxDataExtension.defaultProps.playerSoftwareVersion;
  #playerInitTime: number | undefined = this.#generatePlayerInitTime();
  #adapter: AnyHTMLMediaAdapter | null = null;
  #target: HTMLVideoElement | null = null;
  // What the live monitor currently reflects, so a sync can react only to what changed.
  #monitoredSrc: string | null = null;
  #monitoredEngine: unknown = null;
  #engineHook: 'hlsjs' | 'dashjs' | null = null;
  // Generated once per instance, so the views of one player group into one session.
  #viewSessionId: string | undefined;

  constructor(props: Partial<MuxDataExtensionProps> = {}) {
    Object.assign(this, props);
  }

  setAdapter(adapter: AnyHTMLMediaAdapter) {
    if (this.#adapter === adapter) return;

    this.#adapter?.removeEventListener('loadstart', this.#syncMonitor);
    this.#adapter = adapter;
    this.#adapter.addEventListener('loadstart', this.#syncMonitor);

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
    this.#adapter?.removeEventListener('loadstart', this.#syncMonitor);
    this.#adapter = null;
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
    const adapter = this.#adapter;
    if (!this.MuxDataSdk || !target || !adapter) return;

    const mux = target.mux;

    if (!mux || mux.deleted) {
      this.#monitor(target, adapter);
      return;
    }

    this.#syncEngineHook(mux, engineOf(adapter));

    const src = adapter.src;
    if (src === this.#monitoredSrc) return;

    // A cleared source isn't a new video (the element's own events wind the view down), and it isn't tracked: the
    // video that loads next is still compared against the last video the monitor was told about.
    if (!src) return;

    const isFirstSource = !this.#monitoredSrc;

    this.#monitoredSrc = src;

    // A monitor started before the first source has its pending view: name the video rather than change it.
    if (isFirstSource) {
      mux.updateData(this.#videoData(adapter));
      return;
    }

    mux.emit('videochange', this.#videoData(adapter));
  }

  /** Keep engine telemetry hooked to the engine actually playing, without restarting the monitor. */
  #syncEngineHook(mux: LiveMuxMonitor, engine: unknown) {
    if (engine === this.#monitoredEngine) return;

    if (this.#engineHook === 'hlsjs') mux.removeHLSJS();

    if (this.#engineHook === 'dashjs') mux.removeDashJS();

    const options = toMuxDataEngineOptions(engine);

    if (options.hlsjs && options.Hls) mux.addHLSJS({ hlsjs: options.hlsjs, Hls: options.Hls });

    if (options.dashjs) mux.addDashJS({ dashjs: options.dashjs });

    this.#trackEngine(engine, options);
  }

  /** Record which engine the monitor reflects and which telemetry hook carries it. */
  #trackEngine(engine: unknown, options: MuxDataEngineOptions) {
    this.#monitoredEngine = engine ?? null;
    this.#engineHook = options.hlsjs ? 'hlsjs' : options.dashjs ? 'dashjs' : null;
  }

  #monitor(target: HTMLVideoElement, adapter: AnyHTMLMediaAdapter) {
    const {
      debug,
      beaconCollectionDomain,
      disableCookies,
      envKey: env_key,
      playerSoftwareName: player_software_name,
      playerSoftwareVersion: player_software_version,
      playerInitTime: player_init_time,
    } = this;

    const engineOptions = toMuxDataEngineOptions(engineOf(adapter));

    this.#monitoredSrc = adapter.src;
    this.#trackEngine(engineOf(adapter), engineOptions);

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
        ...this.#videoData(adapter),
      },
    });
  }

  /**
   * The video-scoped beacon data: the session id, the derived `video_id`, and the caller's metadata, which may override
   * both. Built fresh per use — the caller's `metadata` object is never mutated.
   */
  #videoData(adapter: AnyHTMLMediaAdapter) {
    const metadata = this.metadata ?? {};
    const view_session_id = metadata.view_session_id ?? (this.#viewSessionId ??= this.MuxDataSdk?.utils.generateUUID());
    const video_id = toVideoId({ metadata, src: adapter.src });

    const derived: NonNullable<MuxDataOptions['data']> = {};

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
