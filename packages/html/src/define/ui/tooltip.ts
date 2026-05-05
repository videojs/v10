import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { TooltipLabelElement } from '../../ui/tooltip/tooltip-label-element';
import { TooltipShortcutElement } from '../../ui/tooltip/tooltip-shortcut-element';
import { safeDefine } from '../safe-define';

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
