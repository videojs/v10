import { safeDefine } from '../../registration/safe-define';
import { TooltipShortcutElement } from '../../ui/tooltip/shortcut';

safeDefine(TooltipShortcutElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipShortcutElement.tagName]: TooltipShortcutElement;
  }
}
