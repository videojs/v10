import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { HTMLVideoElementHost } from '../video-host';
import { NativeHlsMediaErrorsMixin } from './errors';
import { NativeHlsMediaStreamTypeMixin } from './stream-type';

export type PreloadType = '' | 'none' | 'metadata' | 'auto';
export type StreamType = MediaStreamType;

export const StreamTypes = MediaStreamTypes;

export interface NativeHlsMediaProps {
  src: string;
  preload: PreloadType;
  streamType: StreamType;
}

export const nativeHlsMediaDefaultProps: NativeHlsMediaProps = {
  src: '',
  preload: 'metadata',
  streamType: MediaStreamTypes.UNKNOWN,
};

class NativeHlsMediaBase extends HTMLVideoElementHost implements Omit<NativeHlsMediaProps, 'streamType'> {
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

export class NativeHlsMedia extends NativeHlsMediaStreamTypeMixin(NativeHlsMediaErrorsMixin(NativeHlsMediaBase)) {}
