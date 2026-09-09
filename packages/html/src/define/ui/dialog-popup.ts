import { safeDefine } from '../../registration/safe-define';
import { DialogPopupElement } from '../../ui/dialog/popup';

safeDefine(DialogPopupElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogPopupElement.tagName]: DialogPopupElement;
  }
}
