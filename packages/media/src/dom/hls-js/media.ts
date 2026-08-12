import { deepEqual } from '@videojs/utils/object';
import Hls, { type HlsConfig as HlsJsConfig } from 'hls.js';
import { bridgeEvents } from '../../core/bridge-events';
import { type DrmSystemsConfig, KeySystems } from '../../core/drm';

import { type MediaStreamType, MediaStreamTypes } from '../../core/types';
import { type NativeHlsConfig, NativeHlsMedia, type NativeHlsSource } from '../native-hls';
import { HTMLVideoElementHost } from '../video-host';
import { HlsJsOnlyMedia } from './hls-js-only';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export { Hls };

export type PlaybackType = (typeof PlaybackTypes)[keyof typeof PlaybackTypes];
export type SourceType = (typeof ContentTypes)[keyof typeof ContentTypes];
export type StreamType = MediaStreamType;

export const PlaybackTypes = {
  MSE: 'mse',
  NATIVE: 'native',
};

export const ContentTypes = {
  M3U8: 'application/vnd.apple.mpegurl',
  MP4: 'video/mp4',
};

export const StreamTypes = MediaStreamTypes;

export interface HlsMediaProps {
  src: string;
  source: HlsSource | null;
  preload: PreloadType;
  streamType: StreamType;
}

/**
 * Structured HLS source: which source to play, plus how to play it.
 *
 * Playback options are namespaced by engine. There are two paths here — hls.js
 * and the browser's own HLS support — and only one of them runs, so a source
 * describes both without either engine reading the other's options.
 *
 * `preferPlayback` and the engine options are all read when the engine is
 * constructed, so changing any of them recreates it.
 */
export interface HlsSource {
  /** Manifest URL. Mirrors the host's `src` property. */
  src?: string | undefined;
  /** MIME type of the source. Takes precedence over inference from `src`. */
  type?: SourceType | undefined;
  /**
   * Preferred playback path: `'mse'` for hls.js, `'native'` for the browser's
   * own HLS support. Ignored when the preferred path cannot play the source.
   */
  preferPlayback?: PlaybackType | undefined;
  /**
   * License servers for protected content, keyed by EME key system id.
   *
   * Engine neutral, because which engine plays is decided later: hls.js is
   * handed every system named here (with EME switched on), and native playback
   * negotiates the `com.apple.fps` entry itself. Name every system you hold a
   * license server for — which one is used is the browser's choice.
   */
  drm?: DrmSystemsConfig | undefined;
  /**
   * Playback options, keyed by the engine that reads them. Only one of the two
   * engines below ends up playing, and each reads only its own key.
   */
  engine?: HlsEngineConfig | undefined;
}

/** The engines an HLS source can configure. */
export interface HlsEngineConfig {
  /**
   * hls.js's own configuration, passed through untouched. A `drmSystems` of its
   * own replaces `source.drm` for hls.js — an escape hatch for licensing MSE
   * playback differently, or for the parts of hls.js's DRM configuration
   * `source.drm` does not cover.
   */
  hlsJs?: Partial<HlsJsConfig> | undefined;
  /**
   * Options for the browser's own HLS playback, used whenever the native path
   * is the one taken. Its `drmSystems` replaces `source.drm` for that path in
   * the same way.
   */
  nativeHls?: NativeHlsConfig | undefined;
}

export const hlsMediaDefaultProps: HlsMediaProps = {
  src: '',
  source: null,
  preload: 'metadata',
  streamType: MediaStreamTypes.UNKNOWN,
};

class HlsMediaEvent extends Event {}

/**
 * @fires sourcechange - Fired when `source` changes, either directly or by resolving a new `src`. Read `source` for the new value.
 * @fires streamtypechange - Fired when the detected stream type changes. Read `streamType` for the new value.
 * @fires targetlivewindowchange - Fired when the target live window changes. Read `targetLiveWindow` for the new value.
 */
export class HlsJsMedia extends HTMLVideoElementHost implements HlsMediaProps {
  #delegate: HlsJsOnlyMedia | NativeHlsMedia | null = null;
  #mediaElement: HTMLVideoElement | null = null;
  #src = hlsMediaDefaultProps.src;
  #source: HlsSource | null = hlsMediaDefaultProps.source;
  #preload = hlsMediaDefaultProps.preload;
  #streamType: StreamType = hlsMediaDefaultProps.streamType;
  #isUserStreamType = false;
  #loadRequested?: Promise<void> | null;
  #prevEngineConfigKey?: Record<string, any> | null;

  constructor() {
    super();
    // Cancel the native loadstart event, it's handled in the load method.
    this.addEventListener('loadstart', this.#stopTargetLoadStartEvent);
  }

  attach(target: HTMLVideoElement) {
    this.#mediaElement = target;
    super.attach(target);
    this.#delegate?.attach(target);
  }

  detach() {
    this.#delegate?.detach();
    super.detach();
    this.#mediaElement = null;
  }

  destroy() {
    this.detach();
    this.#engineDestroy();
    super.destroy();
    this.removeEventListener('loadstart', this.#stopTargetLoadStartEvent);
  }

  /**
   * Underlying playback engine — the hls.js `Hls` instance when playing via
   * MSE, otherwise `null`. An advanced escape hatch for direct engine access;
   * normal playback is driven through this element's own properties and methods.
   */
  get engine() {
    return this.#delegate?.engine ?? null;
  }

  get error() {
    return this.#delegate?.error ?? null;
  }

  /** Populated only while the hls.js (MSE) engine is active; otherwise `undefined`. */
  get videoTracks() {
    return this.#delegate instanceof HlsJsOnlyMedia ? this.#delegate.videoTracks : undefined;
  }

  /** Populated only while the hls.js (MSE) engine is active; otherwise `undefined`. */
  get audioTracks() {
    return this.#delegate instanceof HlsJsOnlyMedia ? this.#delegate.audioTracks : undefined;
  }

  /** Selectable quality levels, populated only while the hls.js (MSE) engine is active; otherwise `undefined`. */
  get videoRenditions() {
    return this.#delegate instanceof HlsJsOnlyMedia ? this.#delegate.videoRenditions : undefined;
  }

  /** Selectable audio variants, populated only while the hls.js (MSE) engine is active; otherwise `undefined`. */
  get audioRenditions() {
    return this.#delegate instanceof HlsJsOnlyMedia ? this.#delegate.audioRenditions : undefined;
  }

  /**
   * Media source URL. Assigning it replaces the identity half of `source` and
   * leaves `type` and the engine options intact, so changing the URL never
   * disturbs engine configuration.
   */
  get src() {
    return this.#src;
  }

  set src(src: string) {
    // `src` says which source to play; every other field says how to play it, so
    // they carry over.
    const { type, preferPlayback, drm, engine } = this.#source ?? {};
    const next: HlsSource = {
      ...(type && { type }),
      ...(preferPlayback && { preferPlayback }),
      ...(drm && { drm }),
      ...(engine && { engine }),
      ...(src && { src }),
    };

    // Everything happens in the `source` setter, so there is one path for storing
    // it, deciding on a load, and dispatching `sourcechange`.
    this.source = Object.keys(next).length > 0 ? next : null;
  }

  /**
   * Structured source: what to play (`src`, an optional `type`) plus how to play
   * it (`preferPlayback`, `engine`). Assigning it derives `src`.
   *
   * Sources are compared structurally, so reassigning an equivalent object — an
   * inline React prop, for instance — is a no-op. Only a change to the engine
   * options (or to the resolved content type) recreates the playback engine.
   */
  get source(): HlsSource | null {
    return this.#source;
  }

  set source(value: HlsSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    const src = source?.src ?? '';
    const srcChanged = this.#src !== src;

    this.#source = source;
    this.#src = src;

    // Assigning is always a source change, so it is always announced.
    this.dispatchEvent(new Event('sourcechange'));

    // Only reload for something playback depends on. Subclasses add params that
    // describe images rather than the stream — Mux's `poster` and `storyboard` —
    // and changing one of those must not restart what is already playing.
    if (srcChanged || this.#shouldEngineUpdate(this.#engineConfigKey())) this.#requestLoad();
  }

  /** Preload type (`'none'` / `'metadata'` / `'auto'`). */
  get preload() {
    return this.#preload;
  }

  set preload(value) {
    this.#preload = value;
    if (this.#delegate) {
      this.#delegate.preload = value;
    }
  }

  /** Current stream type (`'on-demand'` / `'live'` / `'unknown'`). */
  get streamType(): StreamType {
    return this.#delegate?.streamType ?? this.#streamType;
  }

  set streamType(value: StreamType) {
    this.#isUserStreamType = value !== StreamTypes.UNKNOWN;

    if (this.#delegate) {
      this.#delegate.streamType = value;
      this.#streamType = this.#delegate.streamType;
      return;
    }

    if (this.#streamType === value) return;
    this.#streamType = value;
    this.dispatchEvent(new HlsMediaEvent('streamtypechange'));
  }

  /**
   * Presentation time marking the start of the Live Edge Window.
   *
   * Derived from the delegate on every read; `NaN` when no delegate is
   * attached or the stream is not live.
   */
  get liveEdgeStart() {
    return this.#delegate?.liveEdgeStart ?? Number.NaN;
  }

  /**
   * Seekable range size for live content. `0` for standard live, `Infinity`
   * for DVR, `NaN` for on-demand or unknown. Fires `targetlivewindowchange`
   * when the value changes (bridged from the delegate).
   */
  get targetLiveWindow() {
    return this.#delegate?.targetLiveWindow ?? Number.NaN;
  }

  async load() {
    this.#loadRequested = null;

    if (this.remote.state === 'connected') {
      this.dispatchEvent(new HlsMediaEvent('loadstart'));
      return super.load();
    }

    if (this.#shouldEngineUpdate(this.#engineConfigKey())) {
      this.#engineDestroy();
      this.#prevEngineConfigKey = this.#engineConfigKey();

      // Read the stored source, not the `source` getter: subclasses override the
      // getter to return what was assigned to them, while the fields below come
      // from what they resolved and handed down (Mux fills in the DRM options).
      const { type, preferPlayback, drm, engine } = this.#source ?? {};
      const { hlsJs, nativeHls } = engine ?? {};
      const contentType = type ?? inferContentType(this.src);
      const useMse = Hls.isSupported() && contentType === ContentTypes.M3U8 && preferPlayback !== PlaybackTypes.NATIVE;

      this.#delegate = useMse
        ? new HlsJsOnlyMedia({ config: withDrmSystems(hlsJs, drm) })
        : this.#createNativeDelegate(drm, nativeHls, hlsJs);

      bridgeEvents(this.#delegate, this);

      // Apply user `streamType` before `attach()` so native delegates do not run
      // synchronous duration-based detection first and emit a transient value.
      if (this.#isUserStreamType) {
        this.#delegate.streamType = this.#streamType;
      }

      this.#delegate.preload = this.preload;

      if (this.#mediaElement) {
        this.#delegate.attach(this.#mediaElement);
      }
    }

    if (this.#delegate) {
      this.dispatchEvent(new HlsMediaEvent('loadstart'));
      this.#delegate.src = this.src;
    }
  }

  /**
   * A native delegate carrying the native half of the source — the DRM
   * configuration and the native engine options, which it applies the same
   * precedence to. Its `src` is assigned separately, once the delegate is wired
   * up, and carries what is set here forward.
   */
  #createNativeDelegate(
    drm: DrmSystemsConfig | undefined,
    nativeHls: NativeHlsConfig | undefined,
    hlsJs: Partial<HlsJsConfig> | undefined
  ) {
    if (__DEV__) {
      // The delegate applies the same precedence, so the warning has to read — and
      // name — whatever it will end up licensing against. An escape hatch replaces
      // `source.drm` rather than adding to it, so pointing at the wrong one of the
      // two would send a reader looking in a field that is already correct.
      const drmSystems = nativeHls?.drmSystems ?? drm;
      const field = nativeHls?.drmSystems ? 'source.engine.nativeHls.drmSystems' : 'source.drm';
      const isProtected = hlsJs?.emeEnabled || hlsJs?.drmSystems || Object.keys(drmSystems ?? {}).length > 0;

      if (isProtected && !drmSystems?.[KeySystems.FAIRPLAY]) {
        console.warn(
          `[vjs-drm] Native HLS playback negotiates FairPlay itself and never sees the hls.js DRM configuration, and no \`${KeySystems.FAIRPLAY}\` license server is named in \`${field}\`. DRM-protected media will not play.`
        );
      }
    }

    const media = new NativeHlsMedia();
    const source: NativeHlsSource = {
      ...(drm && { drm }),
      ...(nativeHls && { engine: { nativeHls } }),
    };

    if (Object.keys(source).length > 0) media.source = source;
    return media;
  }

  #stopTargetLoadStartEvent = (event: Event) => {
    if (!(event instanceof HlsMediaEvent)) event.stopImmediatePropagation();
  };

  async #requestLoad() {
    if (this.#loadRequested) return;
    await (this.#loadRequested = Promise.resolve());
    this.#loadRequested = null;
    this.load();
  }

  #shouldEngineUpdate(nextEngineConfigKey: Record<string, any>) {
    return !deepEqual(this.#prevEngineConfigKey, nextEngineConfigKey);
  }

  /**
   * Every value the engine is constructed from. Compared structurally, so
   * equivalent engine options never trigger a rebuild — including nested ones
   * like `drmSystems`, which a flat comparison would see as changed whenever
   * the object identity did.
   */
  #engineConfigKey() {
    const { type, preferPlayback, drm, engine } = this.#source ?? {};
    return { drm, engine, preferPlayback, contentType: type ?? inferContentType(this.src) };
  }

  #engineDestroy() {
    this.#delegate?.destroy();
    this.#delegate = null;
    this.#prevEngineConfigKey = null;
    this.#loadRequested = null;
    // Delegate teardown already emits `streamtypechange` (bridged); only sync cache.
    if (!this.#isUserStreamType) this.#streamType = StreamTypes.UNKNOWN;
  }
}

/**
 * hls.js configuration with the source's DRM licensing folded in. hls.js takes
 * `drmSystems` in the same shape as `source.drm`, so the standardized config is
 * what it plays from unless `engine.hlsJs` names servers of its own.
 *
 * hls.js runs key exchange only while `emeEnabled` is set, so configured DRM
 * switches it on — short of an explicit `emeEnabled: false`, which stays a way
 * to describe a source's licensing without acting on it.
 */
function withDrmSystems(
  hlsJs: Partial<HlsJsConfig> | undefined,
  drm: DrmSystemsConfig | undefined
): Partial<HlsJsConfig> {
  const drmSystems = hlsJs?.drmSystems ?? drm;
  if (!drmSystems || Object.keys(drmSystems).length === 0) return { ...hlsJs };

  // hls.js declares `serverCertificateUrl` without `undefined`, which an
  // omittable property here is allowed to carry. The values are the same.
  return { emeEnabled: true, ...hlsJs, drmSystems: drmSystems as HlsJsConfig['drmSystems'] };
}

function inferContentType(src: string): SourceType {
  const path = src.split(/[?#]/)[0] ?? '';
  if (path.endsWith('.mp4')) return ContentTypes.MP4;
  return ContentTypes.M3U8;
}
