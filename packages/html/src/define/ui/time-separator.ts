import { safeDefine } from '../../registration/safe-define';
import { TimeSeparatorElement } from '../../ui/time/separator';

safeDefine(TimeSeparatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeSeparatorElement.tagName]: TimeSeparatorElement;
  }
}
