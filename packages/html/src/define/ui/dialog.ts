import { safeDefine } from '../../registration/safe-define';
import { DialogElement } from '../../ui/dialog/dialog-element';

safeDefine(DialogElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogElement.tagName]: DialogElement;
  }
}
