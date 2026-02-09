import { ReactiveElement } from '@lit/reactive-element';
import type { Constructor } from '@videojs/utils/types';

export class MediaElement extends ReactiveElement {
  protected createRenderRoot() {
    return this;
  }
}

export interface MediaElementConstructor extends Constructor<MediaElement> {}
