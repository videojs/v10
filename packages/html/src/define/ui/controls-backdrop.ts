import { safeDefine } from '../../registration/safe-define';
import { ControlsBackdropElement } from '../../ui/controls/backdrop';

safeDefine(ControlsBackdropElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsBackdropElement.tagName]: ControlsBackdropElement;
  }
}
