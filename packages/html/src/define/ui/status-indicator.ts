import { safeDefine } from '../../registration/safe-define';
import { StatusIndicatorElement } from '../../ui/status-indicator/status-indicator-element';

safeDefine(StatusIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusIndicatorElement.tagName]: StatusIndicatorElement;
  }
}
