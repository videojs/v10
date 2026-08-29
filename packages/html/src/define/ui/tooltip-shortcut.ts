import { safeDefine } from '../../registration/safe-define';
import { TooltipShortcutElement } from '../../ui/tooltip/tooltip-shortcut-element';

safeDefine(TooltipShortcutElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipShortcutElement.tagName]: TooltipShortcutElement;
  }
}
