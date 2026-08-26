import { safeDefine } from '../../registration/safe-define';
import { SeekIndicatorValueElement } from '../../ui/seek-indicator/seek-indicator-value-element';

safeDefine(SeekIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekIndicatorValueElement.tagName]: SeekIndicatorValueElement;
  }
}
