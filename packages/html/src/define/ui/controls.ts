import { safeDefine } from '../../registration/safe-define';
import { ControlsElement } from '../../ui/controls/controls-element';

safeDefine(ControlsElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
  }
}
