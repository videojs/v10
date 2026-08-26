import { safeDefine } from '../../registration/safe-define';
import { ControlsBackdropElement } from '../../ui/controls/controls-backdrop-element';

safeDefine(ControlsBackdropElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsBackdropElement.tagName]: ControlsBackdropElement;
  }
}
