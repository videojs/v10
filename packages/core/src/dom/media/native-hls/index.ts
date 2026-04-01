import { DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export class NativeHlsMediaDelegate extends EventTarget {
  #target: HTMLMediaElement | null = null;
  #src: string = '';
  #preload: PreloadType = 'metadata';

  get target() {
    return this.#target;
  }

  get engine() {
    return null;
  }

  get error() {
    return this.target?.error ?? null;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;

    if (this.#target) {
      this.#target.src = src;
    }
  }

  get preload() {
    return this.#preload ?? 'metadata';
  }

  set preload(value: PreloadType) {
    this.#preload = value;

    if (this.#target) {
      this.#target.preload = value;
    }
  }

  attach(target: HTMLMediaElement) {
    this.#target = target;

    if (this.preload !== this.#target.preload) {
      this.#target.preload = this.preload;
    }

    if (this.src !== this.#target.src) {
      this.#target.src = this.src;
    }
  }

  detach() {
    this.#target = null;
  }

  destroy() {
    this.#target = null;
  }
}

export class NativeHlsCustomMedia extends DelegateMixin(CustomVideoElement, NativeHlsMediaDelegate) {}

export class NativeHlsMedia extends DelegateMixin(VideoProxy, NativeHlsMediaDelegate) {}
