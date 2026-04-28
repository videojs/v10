import { SeekIndicatorValueElement } from '../../ui/seek-indicator/seek-indicator-value-element';
import { safeDefine } from '../safe-define';

safeDefine(SeekIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekIndicatorValueElement.tagName]: SeekIndicatorValueElement;
  }
}
