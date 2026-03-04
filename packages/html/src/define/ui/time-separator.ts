import { TimeSeparatorElement } from '../../ui/time/time-separator-element';
import { safeDefine } from '../safe-define';

safeDefine(TimeSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSeparatorElement.tagName]: TimeSeparatorElement;
  }
}
