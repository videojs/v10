import { safeDefine } from '../../registration/safe-define';
import { SeekIndicatorValueElement } from '../../ui/seek-indicator/value';

safeDefine(SeekIndicatorValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekIndicatorValueElement.tagName]: SeekIndicatorValueElement;
  }
}
