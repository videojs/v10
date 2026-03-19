import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { HlsMedia } from '../hls';
import { VideoProxy } from '../proxy';

export class MuxMediaDelegate implements Delegate {
  #engine = new HlsMedia();

  get engine() {
    return this.#engine;
  }

  attach(target: EventTarget): void {
    this.#engine.attach(target);
  }

  detach(): void {
    this.#engine.detach();
  }

  destroy(): void {
    this.#engine.destroy();
  }

  set src(src: string) {
    this.#engine.src = src;
  }

  get src(): string {
    return this.#engine.src;
  }
}

export class MuxCustomMedia extends DelegateMixin(CustomVideoElement, MuxMediaDelegate) {}

export class MuxMedia extends DelegateMixin(VideoProxy, MuxMediaDelegate) {}
