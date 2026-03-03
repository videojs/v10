import { TimeSeparatorElement } from '../../ui/time/time-separator-element';

export { TimeSeparatorElement };

customElements.define(TimeSeparatorElement.tagName, TimeSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSeparatorElement.tagName]: TimeSeparatorElement;
  }
}
