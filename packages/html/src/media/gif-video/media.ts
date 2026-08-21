import { CustomMediaElement, VideoCSSVars } from '@videojs/media/dom/custom-media-element';
import { GifMedia } from '@videojs/media/dom/gif';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

class GifCustomMediaElement extends CustomMediaElement('canvas', GifMedia) {
  static override getTemplateHTML = (): string => {
    return /*html*/ `
      <style>
        :host {
          display: contents;
        }

        canvas {
          display: block;
          width: 100%;
          height: 100%;
          border-radius: var(${VideoCSSVars.borderRadius});
          object-fit: var(${VideoCSSVars.objectFit}, contain);
          object-position: var(${VideoCSSVars.objectPosition}, center);
        }
      </style>
      <slot name="media">
        <canvas part="canvas"></canvas>
      </slot>
      <slot></slot>
    `;
  };
}

export class GifVideo extends MediaAttachMixin(GifCustomMediaElement) {}
