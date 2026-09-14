import { safeDefine } from '../../registration/safe-define';
import { TitleValueElement } from '../../ui/title/value';

safeDefine(TitleValueElement);

declare global {
  interface HTMLElementTagNameMap {
    [TitleValueElement.tagName]: TitleValueElement;
  }
}
