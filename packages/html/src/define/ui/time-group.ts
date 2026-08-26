import { safeDefine } from '../../registration/safe-define';
import { TimeGroupElement } from '../../ui/time/time-group-element';

safeDefine(TimeGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeGroupElement.tagName]: TimeGroupElement;
  }
}
