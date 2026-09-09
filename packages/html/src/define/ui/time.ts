import { safeDefine } from '../../registration/safe-define';
import { TimeElement } from '../../ui/time/element';

safeDefine(TimeElement);

declare global {
  interface HTMLElementTagNameMap {
    [TimeElement.tagName]: TimeElement;
  }
}
