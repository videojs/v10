import { safeDefine } from '../../registration/safe-define';
import { TimeSeparatorElement } from '../../ui/time/time-separator-element';

safeDefine(TimeSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSeparatorElement.tagName]: TimeSeparatorElement;
  }
}
