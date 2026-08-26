import { safeDefine } from '../../registration/safe-define';
import { TitleElement } from '../../ui/title/title-element';

safeDefine(TitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [TitleElement.tagName]: TitleElement;
  }
}
