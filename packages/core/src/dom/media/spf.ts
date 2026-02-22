import { type PlaybackEngineConfig, SpfMedia as SpfMediaAdapter } from '@videojs/spf/dom';
import type { AnyConstructor } from '@videojs/utils/types';

import type { MediaApiProxyTarget } from '../../core/media/proxy';
import { VideoApiProxy } from './proxy';

// This is used by the web component because it needs to extend HTMLElement!
export const SpfMediaMixin = <T extends AnyConstructor<EventTarget>>(Super: T, config?: PlaybackEngineConfig) => {
  class SpfMediaClass extends Super {
    media = new SpfMediaAdapter(config);

    attach(target: MediaApiProxyTarget): void {
      super.attach?.(target);
      this.media.attach(target as HTMLMediaElement);
    }

    detach(): void {
      super.detach?.();
      this.media.detach();
    }

    set src(value: string) {
      this.media.src = value;
    }

    get src(): string {
      return this.media.src;
    }
  }
  return SpfMediaClass as T & typeof SpfMediaClass;
};

// This is used by the React component.
export class SpfMedia extends SpfMediaMixin(VideoApiProxy) {}
