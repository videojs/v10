import { safeDefine } from '../../registration/safe-define';
import { TooltipGroupElement } from '../../ui/tooltip/tooltip-group-element';

safeDefine(TooltipGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipGroupElement.tagName]: TooltipGroupElement;
  }
}
