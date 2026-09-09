import { safeDefine } from '../../registration/safe-define';
import { TooltipGroupElement } from '../../ui/tooltip/group';

safeDefine(TooltipGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipGroupElement.tagName]: TooltipGroupElement;
  }
}
