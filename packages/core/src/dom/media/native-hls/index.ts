import { HTMLVideoElementHost } from '../video-host';
import { NativeHlsMediaErrorsMixin } from './errors';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';

export interface NativeHlsMediaProps {
  src: string;
  preload: PreloadType;
}

export const nativeHlsMediaDefaultProps: NativeHlsMediaProps = {
  src: '',
  preload: 'metadata',
};

class NativeHlsMediaBase extends HTMLVideoElementHost implements NativeHlsMediaProps {
  #src = nativeHlsMediaDefaultProps.src;
  #preload = nativeHlsMediaDefaultProps.preload;

  get engine() {
    return null;
  }

  get src() {
    return this.#src;
  }

  set src(src: string) {
    this.#src = src;
    if (this.target) this.target.src = src;
  }

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

  detach() {
    super.detach();
  }

  destroy() {
    this.detach();
  }
}

export class NativeHlsMedia extends NativeHlsMediaErrorsMixin(NativeHlsMediaBase) {}
