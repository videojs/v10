import { safeDefine } from '../../registration/safe-define';
import { StatusIndicatorElement } from '../../ui/status-indicator/status-indicator-element';
import { StatusIndicatorValueElement } from '../../ui/status-indicator/status-indicator-value-element';

safeDefine(StatusIndicatorElement);
safeDefine(StatusIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusIndicatorElement.tagName]: StatusIndicatorElement;
    [StatusIndicatorValueElement.tagName]: StatusIndicatorValueElement;
  }
}
