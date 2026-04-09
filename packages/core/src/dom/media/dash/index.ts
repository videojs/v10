import type { Mixin } from '@videojs/utils/types';
import * as dashjs from 'dashjs';

import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';

export interface DashMediaProps {
  readonly engine: dashjs.MediaPlayerClass;
  src: string;
  attach(target: EventTarget): void;
  detach(): void;
  destroy(): void;
}

interface DashMediaHost extends EventTarget {
  attach?(target: EventTarget): void;
  detach?(): void;
}

export const DashMediaMixin: Mixin<DashMediaHost, DashMediaProps> = (BaseClass) => {
  class DashMediaImpl extends BaseClass {
    #engine: dashjs.MediaPlayerClass;
    #src = '';

    constructor(...args: any[]) {
      super(...args);
      this.#engine = dashjs.MediaPlayer().create();
      this.#engine.initialize(undefined, undefined, false);
    }

    get engine() {
      return this.#engine;
    }

    get src() {
      return this.#src;
    }

    set src(src) {
      this.#src = src;
      this.#engine.attachSource(src);
    }

    attach(target: EventTarget) {
      this.#engine.attachView(target as HTMLMediaElement);
      super.attach?.(target);
    }

    detach() {
      // dash.js types don't reflect null support, but null is valid for detaching
      this.#engine.attachView(null as unknown as HTMLMediaElement);
      super.detach?.();
    }

    destroy() {
      this.#engine.destroy();
    }
  }

  return DashMediaImpl as any;
};

export class DashMediaBase extends DashMediaMixin(EventTarget) {}

export class DashCustomMedia extends DashMediaMixin(CustomVideoElement) {}

export class DashMedia extends DashMediaMixin(VideoProxy) {}
