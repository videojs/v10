import { safeDefine } from '../../registration/safe-define';
import { TooltipLabelElement } from '../../ui/tooltip/tooltip-label-element';

safeDefine(TooltipLabelElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipLabelElement.tagName]: TooltipLabelElement;
  }
}
