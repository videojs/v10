import * as dashjs from 'dashjs';

import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomMediaMixin } from '../custom-media-element';
import { MediaProxyMixin } from '../proxy';

export class DashMediaDelegateBase implements Delegate {
  #engine: dashjs.MediaPlayerClass;

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
    this.#engine.attachSource(src);
  }

  get src(): string {
    return (this.#engine.getSource() as string) ?? '';
  }
}

// This is used by the web component because it needs to extend HTMLElement!
export class DashCustomMedia extends DelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  DashMediaDelegateBase
) {}

// This is used by the React component.
export class DashMedia extends DelegateMixin(MediaProxyMixin, DashMediaDelegateBase) {}
