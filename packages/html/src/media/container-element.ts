import { containerAttachContext, playerContext } from '../player/context';
import { createContainerMixin } from '../store/container-mixin';
import { MediaElement } from '../ui/media-element';

const ContainerMixin = createContainerMixin({ playerContext, containerAttachContext });

export class MediaContainerElement extends ContainerMixin(MediaElement) {
  static readonly tagName = 'media-container';
}
