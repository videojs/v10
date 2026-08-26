import { safeDefine } from '../../registration/safe-define';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';

safeDefine(ControlsGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
