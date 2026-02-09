import Hls from 'hls.js';
import { Video } from './media';

type Constructor<T> = new (...args: any[]) => T;

export const HlsMediaMixin = <T extends Video>(Super: Constructor<T>) => {
  class HlsMedia extends (Super as Constructor<Video>) {
    engine = new Hls();

    attach(element: HTMLVideoElement): void {
      super.attach(element);
      this.engine.attachMedia(element);
    }

    detach(): void {
      super.detach();
      this.engine.detachMedia();
    }

    set src(value: string) {
      this.engine.loadSource(value);
    }

    get src(): string {
      return this.engine.url ?? '';
    }
  }
  return HlsMedia as Constructor<T & InstanceType<typeof HlsMedia>>;
};

export class HlsMedia extends HlsMediaMixin(Video) {}
