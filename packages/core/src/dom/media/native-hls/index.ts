import { type MediaStreamType, MediaStreamTypes } from '../../../core/media/types';
import { HTMLVideoElementHost } from '../html-video-element-host';
import { nativeHlsErrors } from './errors';
import { nativeHlsLive } from './live';
import { nativeHlsStreamType } from './stream-type';

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

export class NativeHlsMedia extends HTMLVideoElementHost implements NativeHlsMediaProps {
  #src = nativeHlsMediaDefaultProps.src;
  #preload = nativeHlsMediaDefaultProps.preload;

  constructor() {
    super();
    nativeHlsErrors().install(this);
    nativeHlsStreamType().install(this);
    nativeHlsLive().install(this);
  }

  override get target() {
    return super.target;
  }

  override set target(value: HTMLVideoElement | null) {
    super.target = value;
    if (!value) return;
    if (this.preload !== value.preload) value.preload = this.preload;
    if (this.src) value.src = this.src;
  }

  get src() {
    return this.#src;
  }

  set src(value: string) {
    this.#src = value;
    if (this.target) this.target.src = value;
  }

  get preload() {
    return this.#preload;
  }

  set preload(value: PreloadType) {
    this.#preload = value;
    if (this.target) this.target.preload = value;
  }

  get streamType(): StreamType {
    return this.next?.streamType ?? MediaStreamTypes.UNKNOWN;
  }

  set streamType(value: StreamType) {
    if (this.next) this.next.streamType = value;
  }

  get liveEdgeStart() {
    return this.next?.liveEdgeStart ?? Number.NaN;
  }

  get targetLiveWindow() {
    return this.next?.targetLiveWindow ?? Number.NaN;
  }
}
