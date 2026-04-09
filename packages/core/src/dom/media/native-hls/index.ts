import type { Constructor, Mixin } from '@videojs/utils/types';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';
import { NativeHlsMediaErrorsMixin } from './errors';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export interface NativeHlsMediaProps {
  readonly target: HTMLMediaElement | null;
  readonly engine: null;
  src: string;
  preload: PreloadType;
  attach(target: HTMLMediaElement): void;
  detach(): void;
  destroy(): void;
}

interface NativeHlsMediaHost extends EventTarget {
  readonly target?: EventTarget | null;
  attach?(target: EventTarget): void;
  detach?(): void;
}

const NativeHlsMediaBaseMixin: Mixin<NativeHlsMediaHost, NativeHlsMediaProps> = (BaseClass) => {
  class NativeHlsMediaBaseImpl extends BaseClass {
    #target: HTMLMediaElement | null = null;

    get target() {
      return this.#target ?? super.target ?? null;
    }

    #src = '';
    #preload: PreloadType = 'metadata';

    get engine() {
      return null;
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
      super.attach?.(target);
      this.#target = target;

      if (this.preload !== this.#target.preload) {
        this.#target.preload = this.preload;
      }

      if (this.src !== this.#target.src) {
        this.#target.src = this.src;
      }
    }

    detach() {
      super.detach?.();
      this.#target = null;
    }

    destroy() {
      this.#target = null;
    }
  }

  return NativeHlsMediaBaseImpl as any;
};

export function NativeHlsMediaMixin<Base extends Constructor<EventTarget>>(BaseClass: Base) {
  return NativeHlsMediaErrorsMixin(NativeHlsMediaBaseMixin(BaseClass));
}

// This is used to infer the props from.
export class NativeHlsMediaBase extends NativeHlsMediaMixin(EventTarget) {}

// This is used by the web component because it needs to extend HTMLElement!
export class NativeHlsCustomMedia extends NativeHlsMediaMixin(CustomVideoElement) {}

// This is used by the React component.
export class NativeHlsMedia extends NativeHlsMediaMixin(VideoProxy) {}
