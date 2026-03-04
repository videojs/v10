import { PiPButtonElement } from '../../ui/pip-button/pip-button-element';
import { safeDefine } from '../safe-define';

safeDefine(PiPButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PiPButtonElement.tagName]: PiPButtonElement;
  }
}
