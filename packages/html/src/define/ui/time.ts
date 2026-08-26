import { defineTime } from '../../registration/ui-compounds';
import { TimeElement } from '../../ui/time/time-element';
import { TimeGroupElement } from '../../ui/time/time-group-element';
import { TimeSeparatorElement } from '../../ui/time/time-separator-element';

defineTime();

declare global {
  interface HTMLElementTagNameMap {
    [TimeElement.tagName]: TimeElement;
    [TimeGroupElement.tagName]: TimeGroupElement;
    [TimeSeparatorElement.tagName]: TimeSeparatorElement;
  }
}
