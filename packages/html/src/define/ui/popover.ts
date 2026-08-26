import { safeDefine } from '../../registration/safe-define';
import { PopoverElement } from '../../ui/popover/popover-element';

safeDefine(PopoverElement);

declare global {
  interface HTMLElementTagNameMap {
    [PopoverElement.tagName]: PopoverElement;
  }
}
