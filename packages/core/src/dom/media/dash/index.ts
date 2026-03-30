import * as dashjs from 'dashjs';

import { DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';

export class DashMediaDelegate {
  #engine: dashjs.MediaPlayerClass;
  #src: string = '';

  constructor() {
    this.#engine = dashjs.MediaPlayer().create();
    this.#engine.initialize(undefined, undefined, false);
  }

  get engine(): dashjs.MediaPlayerClass {
    return this.#engine;
  }

  attach(target: EventTarget): void {
    this.#engine.attachView(target as HTMLMediaElement);
  }

  detach(): void {
    // dash.js types don't reflect null support, but null is valid for detaching
    this.#engine.attachView(null as unknown as HTMLMediaElement);
  }

  destroy(): void {
    this.#engine.destroy();
  }

  set src(src: string) {
    this.#src = src;
    this.#engine.attachSource(src);
  }

  get src(): string {
    return this.#src;
  }
}

// This is used by the web component because it needs to extend HTMLElement!
export class DashCustomMedia extends DelegateMixin(CustomVideoElement, DashMediaDelegate) {}

// This is used by the React component.
export class DashMedia extends DelegateMixin(VideoProxy, DashMediaDelegate) {}
