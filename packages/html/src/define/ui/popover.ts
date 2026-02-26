import { PopoverArrowElement } from '../../ui/popover/popover-arrow-element';
import { PopoverElement } from '../../ui/popover/popover-element';
import { PopoverPopupElement } from '../../ui/popover/popover-popup-element';
import { PopoverPositionerElement } from '../../ui/popover/popover-positioner-element';
import { PopoverTriggerElement } from '../../ui/popover/popover-trigger-element';

customElements.define(PopoverElement.tagName, PopoverElement);
customElements.define(PopoverTriggerElement.tagName, PopoverTriggerElement);
customElements.define(PopoverPositionerElement.tagName, PopoverPositionerElement);
customElements.define(PopoverPopupElement.tagName, PopoverPopupElement);
customElements.define(PopoverArrowElement.tagName, PopoverArrowElement);

declare global {
  interface HTMLElementTagNameMap {
    [PopoverElement.tagName]: PopoverElement;
    [PopoverTriggerElement.tagName]: PopoverTriggerElement;
    [PopoverPositionerElement.tagName]: PopoverPositionerElement;
    [PopoverPopupElement.tagName]: PopoverPopupElement;
    [PopoverArrowElement.tagName]: PopoverArrowElement;
  }
}
