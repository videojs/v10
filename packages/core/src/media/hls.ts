import Hls from 'hls.js';
import { type MediaElementInstance, Video } from './media';

type Constructor<T = object> = new (...args: unknown[]) => T;

interface HlsMediaBase {
  attach?(element: MediaElementInstance): void;
  detach?(): void;
}

export const HlsMediaMixin = <T extends Constructor>(Super: T) => {
  class HlsMedia extends (Super as Constructor<HlsMediaBase>) {
    engine = new Hls();

    attach(element: MediaElementInstance): void {
      super.attach?.(element);
      this.engine.attachMedia(element);
    }

    detach(): void {
      super.detach?.();
      this.engine.detachMedia();
    }

    set src(value: string) {
      this.engine.loadSource(value);
    }

    get src(): string {
      return this.engine.url ?? '';
    }
  }
  return HlsMedia as T & typeof HlsMedia;
};

export class HlsMedia extends HlsMediaMixin(Video) {}
