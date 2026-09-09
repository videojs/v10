import { safeDefine } from '../../registration/safe-define';
import { HotkeyElement } from '../../ui/hotkey/element';

safeDefine(HotkeyElement);

declare global {
  interface HTMLElementTagNameMap {
    [HotkeyElement.tagName]: HotkeyElement;
  }
}
