import { safeDefine } from '../../registration/safe-define';
import { ControlsContentElement } from '../../ui/controls/controls-content-element';

safeDefine(ControlsContentElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsContentElement.tagName]: ControlsContentElement;
  }
}
