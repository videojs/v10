import { ControlsContentElement } from '../../ui/controls/controls-content-element';
import { safeDefine } from '../safe-define';

safeDefine(ControlsContentElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsContentElement.tagName]: ControlsContentElement;
  }
}
