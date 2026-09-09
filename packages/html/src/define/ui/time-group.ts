import { safeDefine } from '../../registration/safe-define';
import { TimeGroupElement } from '../../ui/time/group';

safeDefine(TimeGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeGroupElement.tagName]: TimeGroupElement;
  }
}
