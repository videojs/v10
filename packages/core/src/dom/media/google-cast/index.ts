import type { MediaStreamType } from '../../../core/media/types';
import type { Component, HTMLMediaElementHost, HTMLMediaTargetLike } from '../media-host';
import { GoogleCastProvider } from './google-cast-provider';
import { requiresCastFramework } from './utils';

type MediaHost = HTMLMediaElementHost<HTMLMediaTargetLike, any>;

export interface GoogleCastProps {
  /** Source URL loaded on the Cast receiver. Falls back to the host's `src` / `currentSrc`. */
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

declare module '../media-host' {
  interface MediaComponentConfig {
    googleCast: GoogleCastProps;
  }
}

export class GoogleCast implements GoogleCastProps, Component {
  static readonly configKey = 'googleCast';

  #src: string | undefined;
  #contentType: string | undefined;
  #streamType: MediaStreamType | undefined;
  #receiver: string | undefined;
  #customData: Record<string, unknown> | null | undefined;
  #media: MediaHost | null = null;
  #provider: GoogleCastProvider | null = null;
  #override: Partial<HTMLMediaTargetLike> | null = null;

  constructor(props: GoogleCastProps = {}) {
    Object.assign(this, props);
  }

  setMedia(host: MediaHost) {
    if (!requiresCastFramework()) return;

    this.#media = host;

    this.#provider ??= new GoogleCastProvider(this);
    this.#override = this.#createRemoteOverride();
    this.#provider.remote.addEventListener('connect', this.#onStateChange);
    this.#provider.remote.addEventListener('disconnect', this.#onStateChange);
  }

  attach(target: HTMLMediaTargetLike) {
    this.#provider?.attach(target);
  }

  detach() {
    this.#provider?.detach();
  }

  destroy() {
    this.#provider?.destroy();
    this.#provider = null;
    this.#media = null;
  }

  #onStateChange = () => {
    if (!this.#provider) return;

    if (this.#provider.remote.state === 'connected') {
      this.#override = this.#provider;
    } else {
      this.#override = this.#createRemoteOverride();
    }
  };

  #createRemoteOverride(): Partial<HTMLMediaTargetLike> {
    const provider = this.#provider!;
    return {
      get remote() {
        return provider.remote;
      },
    };
  }

  get targetOverride() {
    return this.#override;
  }

  /** Source URL loaded on the Cast receiver. Falls back to a `<source>` child, `src`, then `currentSrc`. */
  get src() {
    return this.#src ?? this.#media?.querySelector('source')?.src ?? this.#media?.src ?? this.#media?.currentSrc ?? '';
  }

  set src(value: string) {
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

  /** Stream type used on the Cast receiver. Falls back to the host's `streamType` if it exposes one. */
  get streamType() {
    return this.#streamType ?? (this.#media as { streamType?: MediaStreamType } | null)?.streamType;
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
    if (this.#media?.remote.state === 'connected') {
      this.#media.load();
    }
  }
}
