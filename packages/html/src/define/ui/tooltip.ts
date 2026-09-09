import { safeDefine } from '../../registration/safe-define';
import { TooltipElement } from '../../ui/tooltip/element';

safeDefine(TooltipElement);

declare global {
  interface HTMLElementTagNameMap {
    [TooltipElement.tagName]: TooltipElement;
  }
}
