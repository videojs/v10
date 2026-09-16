import { safeDefine } from '../../registration/safe-define';
import { SeekButtonElement } from '../../ui/seek-button/element';

safeDefine(SeekButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekButtonElement.tagName]: SeekButtonElement;
  }
}
