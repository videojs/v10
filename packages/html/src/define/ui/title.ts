import { TitleElement } from '../../ui/title/title-element';
import { safeDefine } from '../safe-define';

safeDefine(TitleElement);

declare global {
  interface HTMLElementTagNameMap {
    [TitleElement.tagName]: TitleElement;
  }
}
