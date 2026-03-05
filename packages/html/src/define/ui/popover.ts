import { PopoverElement } from '../../ui/popover/popover-element';
import { safeDefine } from '../safe-define';

safeDefine(PopoverElement);

declare global {
  interface HTMLElementTagNameMap {
    [PopoverElement.tagName]: PopoverElement;
  }
}
