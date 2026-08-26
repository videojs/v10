import { safeDefine } from '../../registration/safe-define';
import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';

safeDefine(BufferingIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [BufferingIndicatorElement.tagName]: BufferingIndicatorElement;
  }
}
