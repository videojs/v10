import { MediaContainerElement } from '../../media/container-element';
import { safeDefine } from '../safe-define';

safeDefine(MediaContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [MediaContainerElement.tagName]: MediaContainerElement;
  }
}
