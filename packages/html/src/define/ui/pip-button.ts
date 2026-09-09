import { safeDefine } from '../../registration/safe-define';
import { PiPButtonElement } from '../../ui/pip-button/element';

safeDefine(PiPButtonElement);

declare global {
  interface HTMLElementTagNameMap {
    [PiPButtonElement.tagName]: PiPButtonElement;
  }
}
