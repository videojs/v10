import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { EngineLifecycle } from '../../../core/media/engine-lifecycle';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';

export class NativeHlsMediaDelegate extends EngineLifecycle implements Delegate {
  #target: HTMLMediaElement | null = null;

  get engine(): null {
    return null;
  }

  get target(): HTMLMediaElement | null {
    return this.#target;
  }

  load(src?: string): void {
    super.load(src);
    if (this.#target) this.#target.src = this.src;
  }

  attach(target: HTMLMediaElement): void {
    this.#target = target;
  }

  detach(): void {
    this.#target = null;
  }

  destroy(): void {
    this.#target = null;
  }
}

export class NativeHlsCustomMedia extends DelegateMixin(CustomVideoElement, NativeHlsMediaDelegate) {}

export class NativeHlsMedia extends DelegateMixin(VideoProxy, NativeHlsMediaDelegate) {}
