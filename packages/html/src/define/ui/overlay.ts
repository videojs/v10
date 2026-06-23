import { OverlayElement } from '../../ui/overlay/overlay-element';
import { safeDefine } from '../safe-define';

safeDefine(OverlayElement);

declare global {
  interface HTMLElementTagNameMap {
    [OverlayElement.tagName]: OverlayElement;
  }
}
