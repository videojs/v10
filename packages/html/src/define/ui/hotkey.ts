import { HotkeyElement } from '../../ui/hotkey/hotkey-element';
import { safeDefine } from '../safe-define';

safeDefine(HotkeyElement);

declare global {
  interface HTMLElementTagNameMap {
    [HotkeyElement.tagName]: HotkeyElement;
  }
}
