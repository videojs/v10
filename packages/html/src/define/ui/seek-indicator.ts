import { safeDefine } from '../../registration/safe-define';
import { SeekIndicatorElement } from '../../ui/seek-indicator/seek-indicator-element';

safeDefine(SeekIndicatorElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekIndicatorElement.tagName]: SeekIndicatorElement;
  }
}
