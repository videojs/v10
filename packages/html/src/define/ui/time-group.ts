import { TimeGroupElement } from '../../ui/time/time-group-element';
import { safeDefine } from '../safe-define';

safeDefine(TimeGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeGroupElement.tagName]: TimeGroupElement;
  }
}
