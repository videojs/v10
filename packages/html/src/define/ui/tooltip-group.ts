import { TooltipGroupElement } from '../../ui/tooltip/tooltip-group-element';
import { safeDefine } from '../safe-define';

safeDefine(TooltipGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipGroupElement.tagName]: TooltipGroupElement;
  }
}
