import { BufferingIndicatorElement } from '../../ui/buffering-indicator/buffering-indicator-element';
import { safeDefine } from '../safe-define';

safeDefine(BufferingIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [BufferingIndicatorElement.tagName]: BufferingIndicatorElement;
  }
}
