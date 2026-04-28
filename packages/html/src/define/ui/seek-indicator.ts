import { SeekIndicatorElement } from '../../ui/seek-indicator/seek-indicator-element';
import { SeekIndicatorValueElement } from '../../ui/seek-indicator/seek-indicator-value-element';
import { safeDefine } from '../safe-define';

safeDefine(SeekIndicatorElement);
safeDefine(SeekIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekIndicatorElement.tagName]: SeekIndicatorElement;
    [SeekIndicatorValueElement.tagName]: SeekIndicatorValueElement;
  }
}
