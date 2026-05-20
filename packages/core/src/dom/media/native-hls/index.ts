import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { HTMLVideoElementHost } from '../video-host';
import { NativeHlsMediaErrorsMixin } from './errors';
import { NativeHlsMediaLiveMixin } from './live';
import { NativeHlsMediaStreamTypeMixin } from './stream-type';

/** Allowed `preload` attribute values. */
export type PreloadType = '' | 'none' | 'metadata' | 'auto';
/** Stream delivery type. */
export type StreamType = MediaStreamType;

/** Re-export of {@link MediaStreamTypes} for native-HLS consumers. */
export const StreamTypes = MediaStreamTypes;

/** Configuration props for {@link NativeHlsMedia}. */
export interface NativeHlsMediaProps {
  /** Source URL. */
  src: string;
  /** Preload behavior. */
  preload: PreloadType;
  /** Initial stream type before detection. */
  streamType: StreamType;
}

/** Defaults for {@link NativeHlsMediaProps}. */
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

/** Media adapter that drives the browser's built-in HLS support (Safari and others). */
export class NativeHlsMedia extends NativeHlsMediaLiveMixin(
  NativeHlsMediaStreamTypeMixin(NativeHlsMediaErrorsMixin(NativeHlsMediaBase))
) {}
