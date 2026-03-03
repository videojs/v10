import { TimeGroupElement } from '../../ui/time/time-group-element';

export { TimeGroupElement };

customElements.define(TimeGroupElement.tagName, TimeGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeGroupElement.tagName]: TimeGroupElement;
  }
}
