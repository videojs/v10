import { type MediaStreamType, MediaStreamTypes } from '../../core/types';
import { HTMLVideoElementHost } from '../video-host';
import { NativeHlsMediaDrmMixin } from './drm';
import { NativeHlsMediaErrorsMixin } from './errors';
import type { NativeHlsDrmSystemsConfig } from './fairplay';
import { NativeHlsMediaLiveMixin } from './live';
import { NativeHlsMediaStreamTypeMixin } from './stream-type';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';
export type StreamType = MediaStreamType;

export const StreamTypes = MediaStreamTypes;

export interface NativeHlsMediaProps {
  src: string;
  source: NativeHlsSource | null;
  preload: PreloadType;
  streamType: StreamType;
}

/**
 * Structured native HLS source: which source to play, plus how to play it.
 *
 * Playback options sit under `engine`, keyed by engine, rather than at the top
 * level. Native HLS is one of two paths `HlsJsVideo` can take, and namespacing
 * by engine lets a single source describe both without either reading the
 * other's options.
 */
export interface NativeHlsSource {
  /** Manifest URL. Mirrors the host's `src` property. */
  src?: string | undefined;
  /** Playback options, keyed by the engine that reads them. */
  engine?: NativeHlsEngineConfig | undefined;
}

/** The engines a native HLS source can configure. */
export interface NativeHlsEngineConfig {
  /** Options for the browser's own HLS playback. */
  nativeHls?: NativeHlsConfig | undefined;
}

/**
 * Native HLS playback options. There is no JS engine to configure here — the
 * browser plays the manifest itself — so this is what Video.js does around it.
 */
export interface NativeHlsConfig {
  /**
   * License servers for protected content, keyed by key system id, in the same
   * shape hls.js takes. Safari negotiates keys itself; this names the servers
   * it negotiates with, so only the `com.apple.fps` entry is read.
   */
  drmSystems?: NativeHlsDrmSystemsConfig | undefined;
}

export const nativeHlsMediaDefaultProps: NativeHlsMediaProps = {
  src: '',
  source: null,
  preload: 'metadata',
  streamType: MediaStreamTypes.UNKNOWN,
};

class NativeHlsMediaBase extends HTMLVideoElementHost implements Omit<NativeHlsMediaProps, 'streamType'> {
  #src = nativeHlsMediaDefaultProps.src;
  #source: NativeHlsSource | null = nativeHlsMediaDefaultProps.source;
  #preload = nativeHlsMediaDefaultProps.preload;

  /**
   * Underlying playback engine — always `null`. Native HLS has no JS engine;
   * the browser handles playback directly.
   */
  get engine() {
    return null;
  }

  /**
   * Media source URL. Assigning it replaces the identity half of `source` and
   * leaves `engine` intact, so changing the URL never disturbs key exchange.
   */
  get src() {
    return this.#src;
  }

  set src(src: string) {
    // `src` says which source to play; everything else says how to play it, so
    // it carries over.
    const { engine } = this.#source ?? {};
    const next: NativeHlsSource = {
      ...(engine && { engine }),
      ...(src && { src }),
    };

    // Everything happens in the `source` setter, so there is one path for
    // storing it and loading.
    this.source = Object.keys(next).length > 0 ? next : null;
  }

  /**
   * Structured source: what to play (`src`) plus how to play it
   * (`engine.nativeHls`). Assigning it derives `src`.
   *
   * Unlike `HlsJsMedia`, this does not announce a `sourcechange`. It is also
   * the delegate `HlsJsMedia` plays native sources through, and every event it
   * dispatches is re-dispatched there — which already announces its own.
   */
  get source(): NativeHlsSource | null {
    return this.#source;
  }

  set source(value: NativeHlsSource | null) {
    const source = value ?? null;
    // Changing anything takes a new object, so handing the same one back costs
    // nothing.
    if (source === this.#source) return;

    this.#source = source;
    this.#src = source?.src ?? '';
    if (this.target) this.target.src = this.#src;
  }

  /** Preload type (`'none'` / `'metadata'` / `'auto'`). */
  get preload() {
    return this.#preload;
  }

  set preload(value: PreloadType) {
    this.#preload = value;
    if (this.target) this.target.preload = value;
  }

  attach(target: HTMLVideoElement) {
    super.attach(target);

    if (this.preload !== target.preload) target.preload = this.preload;
    if (this.src) target.src = this.src;
  }
}

export class NativeHlsMedia extends NativeHlsMediaLiveMixin(
  NativeHlsMediaStreamTypeMixin(NativeHlsMediaDrmMixin(NativeHlsMediaErrorsMixin(NativeHlsMediaBase)))
) {}
