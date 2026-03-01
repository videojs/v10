import { TimeSeparatorElement } from '../../ui/time/time-separator-element';

customElements.define(TimeSeparatorElement.tagName, TimeSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSeparatorElement.tagName]: TimeSeparatorElement;
  }
}
