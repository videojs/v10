import type { MediaOverride, PlayerExtension, PlayerTarget } from '@videojs/core/dom';
import type { MediaStreamType } from '@videojs/media';
import { getMediaElement, type HTMLMediaTargetLike } from '@videojs/media/dom';

import { GoogleCastProvider } from './provider';
import { requiresCastFramework } from './utils';

export interface GoogleCastExtensionProps {
  /** Source URL loaded on the Cast receiver. Falls back to the media's `src` / `currentSrc`. */
  src?: string | undefined;
  /** MIME type of the Cast source. When unset, the receiver infers it from the URL. */
  contentType?: string | undefined;
  /** Stream type used on the Cast receiver. */
  streamType?: MediaStreamType | undefined;
  /** Cast receiver application ID. Defaults to Google's default media receiver. */
  receiver?: string | undefined;
  /** Custom data sent to the Cast receiver with the load request. */
  customData?: Record<string, unknown> | null | undefined;
}

/**
 * Player extension that adds Google Cast to whatever media the player attaches: a plain `<video>`, a custom media
 * element, or a media adapter. While a cast session is connected, playback members the player reads route to the
 * receiver; otherwise only `remote` is taken over so the cast button can prompt.
 */
export class GoogleCastExtension implements GoogleCastExtensionProps, PlayerExtension {
  static readonly defaultProps: GoogleCastExtensionProps = {
    src: undefined,
    contentType: undefined,
    streamType: undefined,
    receiver: undefined,
    customData: undefined,
  };

  #src: string | undefined;
  #contentType: string | undefined;
  #streamType: MediaStreamType | undefined;
  #receiver: string | undefined;
  #customData: Record<string, unknown> | null | undefined;
  #media: HTMLMediaTargetLike | null = null;
  #provider: GoogleCastProvider | null = null;
  #override: MediaOverride | null = null;

  constructor(props: GoogleCastExtensionProps = {}) {
    Object.assign(this, props);
  }

  attach({ media }: PlayerTarget) {
    // Every media the player resolves (native element, custom media element, adapter) exposes this surface.
    const target = media as HTMLMediaTargetLike;
    if (this.#media === target) return;

    this.detach();
    this.#media = target;

    if (requiresCastFramework() && !this.#provider) {
      this.#provider = new GoogleCastProvider(this);
      this.#provider.remote.addEventListener('connect', this.#onStateChange);
      this.#provider.remote.addEventListener('disconnect', this.#onStateChange);
      this.#override = this.#createRemoteOverride();
    }

    // The provider drives the native element when there is one: its `<track>` children carry the real modes, and
    // events dispatched there already forward through any custom element or adapter to the player's listeners.
    this.#provider?.attach((getMediaElement(target) as HTMLMediaTargetLike | null) ?? target);
    target.addEventListener('loadstart', this.#onLoadStart);
  }

  detach() {
    this.#media?.removeEventListener('loadstart', this.#onLoadStart);
    this.#media = null;
    this.#provider?.detach();
  }

  destroy() {
    this.detach();
    this.#provider?.destroy();
    this.#provider = null;
    this.#override = null;
  }

  get mediaOverride() {
    return this.#override;
  }

  #onStateChange = () => {
    if (!this.#provider) return;

    if (this.#provider.remote.state === 'connected') {
      this.#override = this.#provider as MediaOverride;
    } else {
      this.#override = this.#createRemoteOverride();
    }
  };

  /**
   * The media started loading a new source locally. While casting, follow it on the receiver; the provider remembers
   * what it last loaded so the several `loadstart`s one local load can produce reach the receiver once.
   */
  #onLoadStart = () => {
    const provider = this.#provider;
    if (!provider || provider.remote.state !== 'connected') return;

    if (provider.loadedSrc === this.src) return;

    void provider.load();
  };

  #createRemoteOverride(): MediaOverride {
    const provider = this.#provider!;

    return {
      get remote() {
        return provider.remote;
      },
    };
  }

  /** Source URL loaded on the Cast receiver. Falls back to a `<source>` child, `src`, then `currentSrc`. */
  get src() {
    return (
      this.#src ??
      this.#media?.querySelector<HTMLSourceElement>('source')?.src ??
      this.#media?.src ??
      this.#media?.currentSrc ??
      ''
    );
  }

  set src(value: string | undefined) {
    if (this.#src === value) return;

    this.#src = value;
    this.#load();
  }

  /** MIME type of the Cast source. When unset, the receiver infers it from the URL. */
  get contentType() {
    return this.#contentType;
  }

  set contentType(value: string | undefined) {
    if (this.#contentType === value) return;

    this.#contentType = value;
    this.#load();
  }

  /** Stream type used on the Cast receiver. Falls back to the media's `streamType` if it exposes one. */
  get streamType() {
    return this.#streamType ?? this.#media?.streamType;
  }

  set streamType(value: MediaStreamType | undefined) {
    if (this.#streamType === value) return;

    this.#streamType = value;
    this.#load();
  }

  /** Cast receiver application ID. Read on session start; falls back to the layer's default. */
  get receiver() {
    return this.#receiver;
  }

  set receiver(value: string | undefined) {
    if (this.#receiver === value) return;

    this.#receiver = value;
    this.#load();
  }

  /** Custom data sent to the Cast receiver with the load request. */
  get customData() {
    return this.#customData;
  }

  set customData(value: Record<string, unknown> | null | undefined) {
    if (this.#customData === value) return;

    this.#customData = value;
    this.#load();
  }

  #load() {
    if (this.#provider?.remote.state === 'connected') {
      void this.#provider.load();
    }
  }
}
