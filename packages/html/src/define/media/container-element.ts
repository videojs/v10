import { playerContext } from '../../player/context';
import { createContainerMixin } from '../../store/container-mixin';
import { MediaElement } from '../../ui/media-element';

const ContainerMixin = createContainerMixin(playerContext);

export class MediaContainerElement extends ContainerMixin(MediaElement) {
  static readonly tagName = 'media-container';
}

declare global {
  interface HTMLElementTagNameMap {
    [MediaContainerElement.tagName]: MediaContainerElement;
  }
}
