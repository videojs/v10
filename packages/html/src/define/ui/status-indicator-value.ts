import { StatusIndicatorValueElement } from '../../ui/status-indicator/status-indicator-value-element';
import { safeDefine } from '../safe-define';

safeDefine(StatusIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusIndicatorValueElement.tagName]: StatusIndicatorValueElement;
  }
}
