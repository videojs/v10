import { safeDefine } from '../../registration/safe-define';
import { StatusIndicatorValueElement } from '../../ui/status-indicator/value';

safeDefine(StatusIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [StatusIndicatorValueElement.tagName]: StatusIndicatorValueElement;
  }
}
