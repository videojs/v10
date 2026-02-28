import { PopoverElement } from '../../ui/popover/popover-element';

customElements.define(PopoverElement.tagName, PopoverElement);

declare global {
  interface HTMLElementTagNameMap {
    [PopoverElement.tagName]: PopoverElement;
  }
}
