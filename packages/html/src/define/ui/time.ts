import { TimeElement } from '../../ui/time/time-element';
import { TimeGroupElement } from '../../ui/time/time-group-element';
import { TimeSeparatorElement } from '../../ui/time/time-separator-element';
import { safeDefine } from '../safe-define';

safeDefine(TimeElement);
safeDefine(TimeGroupElement);
safeDefine(TimeSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeElement.tagName]: TimeElement;
  }
}
