import { TimeElement } from '../../ui/time/time-element';

export { TimeGroupElement } from './time-group';
export { TimeSeparatorElement } from './time-separator';

customElements.define(TimeElement.tagName, TimeElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeElement.tagName]: TimeElement;
  }
}
