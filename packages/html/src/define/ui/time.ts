import { TimeElement } from '../../ui/time/time-element';

import './time-group';
import './time-separator';

customElements.define(TimeElement.tagName, TimeElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeElement.tagName]: TimeElement;
  }
}
