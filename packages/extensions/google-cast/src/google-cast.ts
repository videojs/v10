import type { MediaStreamType } from '@videojs/media';
import type { AnyHTMLMediaAdapter, HTMLMediaTargetLike, MediaExtension } from '@videojs/media/dom';

import { GoogleCastProvider } from './google-cast-provider';
import { requiresCastFramework } from './utils';

export interface GoogleCastExtensionProps {
  /** Source URL loaded on the Cast receiver. Falls back to the adapter's `src` / `currentSrc`. */
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

export class GoogleCastExtension implements GoogleCastExtensionProps, MediaExtension {
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
  #adapter: AnyHTMLMediaAdapter | null = null;
  #provider: GoogleCastProvider | null = null;
  #override: Partial<HTMLMediaTargetLike> | null = null;

  constructor(props: GoogleCastExtensionProps = {}) {
    Object.assign(this, props);
  }

  setAdapter(adapter: AnyHTMLMediaAdapter) {
    if (!requiresCastFramework()) return;

    this.#adapter = adapter;

    if (!this.#provider) {
      this.#provider = new GoogleCastProvider(this);
      this.#provider.remote.addEventListener('connect', this.#onStateChange);
      this.#provider.remote.addEventListener('disconnect', this.#onStateChange);
      this.#override = this.#createRemoteOverride();
    }
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
    this.#adapter = null;
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
    return (
      this.#src ?? this.#adapter?.querySelector('source')?.src ?? this.#adapter?.src ?? this.#adapter?.currentSrc ?? ''
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

  /** Stream type used on the Cast receiver. Falls back to the adapter's `streamType` if it exposes one. */
  get streamType() {
    return this.#streamType ?? (this.#adapter as { streamType?: MediaStreamType } | null)?.streamType;
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
    if (this.#adapter?.remote.state === 'connected') {
      this.#adapter.load();
    }
  }
}
