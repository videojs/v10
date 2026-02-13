import type { MediaApiTarget } from '@videojs/core';
import type { AnyConstructor } from '@videojs/utils/types';
import Hls from 'hls.js';
import { VideoApi } from './api';

// This is used by the web component because it needs to extend HTMLElement!
export const HlsMediaMixin = <T extends AnyConstructor<EventTarget>>(Super: T) => {
  class HlsMedia extends Super {
    engine = new Hls();

    attach(target: MediaApiTarget): void {
      super.attach?.(target);
      this.engine.attachMedia(target as HTMLMediaElement);
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

// This is used by the React component.
export class HlsMedia extends HlsMediaMixin(VideoApi) {}
