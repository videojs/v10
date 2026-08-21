import { ContainerElement } from '../../ui/container/container-element';
import { safeDefine } from '../safe-define';

safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [ContainerElement.tagName]: ContainerElement;
  }
}
