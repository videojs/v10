import type { AnyConstructor, MixinReturn } from '@videojs/utils/types';
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

export function DashMediaMixin<Base extends AnyConstructor<any>>(BaseClass: Base) {
  class DashMediaImpl extends (BaseClass as AnyConstructor<any>) {
    #engine: dashjs.MediaPlayerClass;
    #src: string = '';

    constructor(...args: any[]) {
      super(...args);
      this.#engine = dashjs.MediaPlayer().create();
      this.#engine.initialize(undefined, undefined, false);
    }

    get engine(): dashjs.MediaPlayerClass {
      return this.#engine;
    }

    get src(): string {
      return this.#src;
    }

    set src(src: string) {
      this.#src = src;
      this.#engine.attachSource(src);
    }

    attach(target: EventTarget): void {
      this.#engine.attachView(target as HTMLMediaElement);
      (super.attach as any)?.(target);
    }

    detach(): void {
      // dash.js types don't reflect null support, but null is valid for detaching
      this.#engine.attachView(null as unknown as HTMLMediaElement);
      (super.detach as any)?.();
    }

    destroy(): void {
      this.#engine.destroy();
    }
  }

  return DashMediaImpl as unknown as MixinReturn<Base, DashMediaProps>;
}

export class DashMediaBase extends DashMediaMixin(class {}) {}

export class DashCustomMedia extends DashMediaMixin(CustomVideoElement) {}

export class DashMedia extends DashMediaMixin(VideoProxy) {}
