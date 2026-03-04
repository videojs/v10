import { SeekButtonElement } from '../../ui/seek-button/seek-button-element';
import { safeDefine } from '../safe-define';

safeDefine(SeekButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [SeekButtonElement.tagName]: SeekButtonElement;
  }
}
