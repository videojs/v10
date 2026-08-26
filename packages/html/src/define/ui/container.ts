import { safeDefine } from '../../registration/safe-define';
import { ContainerElement } from '../../ui/container/container-element';

safeDefine(ContainerElement);

declare global {
  interface HTMLElementTagNameMap {
    [ContainerElement.tagName]: ContainerElement;
  }
}
