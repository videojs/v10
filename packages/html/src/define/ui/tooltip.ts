import { safeDefine } from '../../registration/safe-define';
import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { TooltipLabelElement } from '../../ui/tooltip/tooltip-label-element';
import { TooltipShortcutElement } from '../../ui/tooltip/tooltip-shortcut-element';

safeDefine(TooltipLabelElement);
safeDefine(TooltipShortcutElement);
safeDefine(TooltipElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipLabelElement.tagName]: TooltipLabelElement;
    [TooltipShortcutElement.tagName]: TooltipShortcutElement;
    [TooltipElement.tagName]: TooltipElement;
  }
}
