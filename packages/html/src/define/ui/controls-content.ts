import { safeDefine } from '../../registration/safe-define';
import { ControlsContentElement } from '../../ui/controls/content';

safeDefine(ControlsContentElement);

declare global {
  interface HTMLElementTagNameMap {
    [ControlsContentElement.tagName]: ControlsContentElement;
  }
}
