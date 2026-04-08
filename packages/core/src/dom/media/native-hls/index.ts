import type { AnyConstructor, MixinReturn } from '@videojs/utils/types';
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

function NativeHlsMediaBaseMixin<Base extends AnyConstructor<any>>(BaseClass: Base) {
  class NativeHlsMediaBaseImpl extends (BaseClass as AnyConstructor<any>) {
    #target: HTMLMediaElement | null = null;

    get target() {
      return this.#target ?? super.target;
    }

    #src: string = '';
    #preload: PreloadType = 'metadata';

    get engine() {
      return null;
    }

    get src() {
      return this.#src;
    }

    set src(src: string) {
      this.#src = src;

      if (this.target) {
        this.target.src = src;
      }
    }

    get preload() {
      return this.#preload ?? 'metadata';
    }

    set preload(value: PreloadType) {
      this.#preload = value;

      if (this.target) {
        this.target.preload = value;
      }
    }

    attach(target: HTMLMediaElement) {
      (super.attach as any)?.(target);
      this.#target = target;

      if (this.target && this.preload !== this.target.preload) {
        this.target.preload = this.preload;
      }

      if (this.target && this.src !== this.target.src) {
        this.target.src = this.src;
      }
    }

    detach() {
      (super.detach as any)?.();
      this.#target = null;
    }

    destroy() {
      (super.detach as any)?.();
    }
  }

  return NativeHlsMediaBaseImpl as unknown as MixinReturn<Base, NativeHlsMediaProps>;
}

export function NativeHlsMediaMixin<Base extends AnyConstructor<any>>(BaseClass: Base) {
  return NativeHlsMediaErrorsMixin(NativeHlsMediaBaseMixin(BaseClass));
}

// This is used to infer the props from.
export class NativeHlsMediaBase extends NativeHlsMediaMixin(EventTarget) {}

// This is used by the web component because it needs to extend HTMLElement!
export class NativeHlsCustomMedia extends NativeHlsMediaMixin(CustomVideoElement) {}

// This is used by the React component.
export class NativeHlsMedia extends NativeHlsMediaMixin(VideoProxy) {}
