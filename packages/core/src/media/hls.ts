import Hls from 'hls.js';
import { type MediaElementInstance, Video } from './media';

export const HlsMediaMixin = <T extends object>(Super: T) => {
  class HlsMedia extends (Super as any) {
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
