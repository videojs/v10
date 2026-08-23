import { ControlsBackdropElement } from '../../ui/controls/controls-backdrop-element';
import { safeDefine } from '../safe-define';

safeDefine(ControlsBackdropElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsBackdropElement.tagName]: ControlsBackdropElement;
  }
}
