import { ControlsGroupElement } from '../../ui/controls/controls-group-element';
import { safeDefine } from '../safe-define';

safeDefine(ControlsGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsGroupElement.tagName]: ControlsGroupElement;
  }
}
