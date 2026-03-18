import { HotkeysElement } from '../../ui/hotkeys/hotkeys-element';
import { safeDefine } from '../safe-define';

safeDefine(HotkeysElement);

declare global {
  interface HTMLElementTagNameMap {
    [HotkeysElement.tagName]: HotkeysElement;
  }
}
