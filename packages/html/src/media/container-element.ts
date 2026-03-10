import { playerContext } from '../player/context';
import { createContainerMixin } from '../store/container-mixin';
import '../define/ui/gesture';
import { MediaElement } from '../ui/media-element';

const ContainerMixin = createContainerMixin(playerContext);

export class MediaContainerElement extends ContainerMixin(MediaElement) {
  static readonly tagName = 'media-container';
  static shadowRootOptions = { mode: 'open' } as const;
  static getTemplateHTML(): string {
    return /* html */ `
      <style>
        slot:not([name]) {
          border-radius: inherit;
        }
      </style>
      <slot></slot>
      <slot name="gesture">
        <media-gesture type="pointerup" command="toggle-paused"></media-gesture>
      </slot>
      <slot name="media"></slot>
    `;
  }

  constructor() {
    super();

    if (!this.shadowRoot) {
      const ctor = this.constructor as typeof MediaContainerElement & { getTemplateHTML?: () => string };
      this.attachShadow(ctor.shadowRootOptions);

      if (ctor.getTemplateHTML) {
        this.shadowRoot!.innerHTML = ctor.getTemplateHTML();
      }
    }
  }
}
