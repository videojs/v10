import { TimeElement } from '../../ui/time/time-element';
import { TimeGroupElement } from '../../ui/time/time-group-element';
import { TimeSeparatorElement } from '../../ui/time/time-separator-element';

customElements.define(TimeElement.tagName, TimeElement);
customElements.define(TimeGroupElement.tagName, TimeGroupElement);
customElements.define(TimeSeparatorElement.tagName, TimeSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeElement.tagName]: TimeElement;
    [TimeGroupElement.tagName]: TimeGroupElement;
    [TimeSeparatorElement.tagName]: TimeSeparatorElement;
  }
}
