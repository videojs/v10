import { safeDefine } from '../../registration/safe-define';
import { DialogElement } from '../../ui/dialog/element';

safeDefine(DialogElement);

declare global {
  interface HTMLElementTagNameMap {
    [DialogElement.tagName]: DialogElement;
  }
}
