import { TooltipElement } from '../../ui/tooltip/tooltip-element';
import { safeDefine } from '../safe-define';

safeDefine(TooltipElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipElement.tagName]: TooltipElement;
  }
}
