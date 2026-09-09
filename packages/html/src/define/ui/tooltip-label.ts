import { safeDefine } from '../../registration/safe-define';
import { TooltipLabelElement } from '../../ui/tooltip/label';

safeDefine(TooltipLabelElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipLabelElement.tagName]: TooltipLabelElement;
  }
}
