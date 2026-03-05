import { ControlsElement } from '../../ui/controls/controls-element';
import { ControlsGroupElement } from '../../ui/controls/controls-group-element';
import { safeDefine } from '../safe-define';

safeDefine(ControlsElement);
safeDefine(ControlsGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsElement.tagName]: ControlsElement;
  }
}
