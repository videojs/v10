import { StatusIndicatorElement } from '../../ui/status-indicator/status-indicator-element';
import { StatusIndicatorValueElement } from '../../ui/status-indicator/status-indicator-value-element';
import { safeDefine } from '../safe-define';

safeDefine(StatusIndicatorElement);
safeDefine(StatusIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusIndicatorElement.tagName]: StatusIndicatorElement;
    [StatusIndicatorValueElement.tagName]: StatusIndicatorValueElement;
  }
}
