import * as Watch from '@moq/watch';

import { type MediaDelegate, MediaDelegateMixin } from '../../../core/media/delegate';
import { MediaProxyMixin } from '../../../core/media/proxy';
import { CustomMediaMixin } from '../custom-media-element';

const Moq = Watch.Lite;

const cleanup = new FinalizationRegistry<Watch.Signals.Effect>((signals) => signals.close());

export class MoqMseDelegateBase implements MediaDelegate {
  #connection = new Moq.Connection.Reload({
    enabled: true,
  });

  #broadcast = new Watch.Broadcast({
    connection: this.#connection.established,
    enabled: true,
    name: Moq.Path.empty(),
  });

  #sync = new Watch.Sync();

  #muxer = new Watch.Mse.Muxer(this.#sync, { paused: false });

  #videoSource = new Watch.Video.Source(this.#sync, { broadcast: this.#broadcast });
  #videoMse = new Watch.Video.Mse(this.#muxer, this.#videoSource);

  #audioSource = new Watch.Audio.Source(this.#sync, { broadcast: this.#broadcast });
  #audioMse = new Watch.Audio.Mse(this.#muxer, this.#audioSource);

  #signals = new Watch.Signals.Effect();

  constructor() {
    cleanup.register(this, this.#signals);
    this.#signals.cleanup(() => {
      this.#connection.close();
      this.#broadcast.close();
      this.#sync.close();
      this.#muxer.close();
      this.#videoSource.close();
      this.#videoMse.close();
      this.#audioSource.close();
      this.#audioMse.close();
    });
  }

  attach(target: EventTarget): void {
    this.#muxer.element.set(target as HTMLMediaElement);
  }

  detach(): void {
    this.#muxer.element.set(undefined);
  }

  destroy(): void {
    this.#signals.close();
  }

  get src(): string {
    return this.#connection.url.peek()?.toString() ?? '';
  }

  set src(value: string) {
    this.#connection.url.set(value ? new URL(value) : undefined);
  }

  get name(): string {
    return this.#broadcast.name.peek()?.toString() ?? '';
  }

  set name(value: string) {
    this.#broadcast.name.set(value ? Moq.Path.from(value) : Moq.Path.empty());
  }

  get paused(): boolean {
    return this.#muxer.paused.peek();
  }

  get volume(): number {
    return this.#audioMse.volume.peek();
  }

  set volume(value: number) {
    this.#audioMse.volume.set(value);
  }

  get muted(): boolean {
    return this.#audioMse.muted.peek();
  }

  set muted(value: boolean) {
    this.#audioMse.muted.set(value);
  }

  get currentTime(): number {
    return this.#videoMse.timestamp.peek() / 1000;
  }

  get duration(): number {
    return Number.POSITIVE_INFINITY;
  }

  play(): Promise<void> {
    this.#muxer.paused.set(false);
    return Promise.resolve();
  }

  pause(): void {
    this.#muxer.paused.set(true);
  }
}

export class MoqMseCustomMedia extends MediaDelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  MoqMseDelegateBase
) {}

export class MoqMseMedia extends MediaDelegateMixin(
  MediaProxyMixin(
    globalThis.HTMLVideoElement ?? class {},
    globalThis.HTMLMediaElement ?? class {},
    globalThis.EventTarget ?? class {}
  ),
  MoqMseDelegateBase
) {}
