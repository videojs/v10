import { safeDefine } from '../../registration/safe-define';
import { StatusIndicatorValueElement } from '../../ui/status-indicator/status-indicator-value-element';

safeDefine(StatusIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusIndicatorValueElement.tagName]: StatusIndicatorValueElement;
  }
}
