import { GoogleCastElement } from '../../media/google-cast';
import { safeDefine } from '../../registration/safe-define';

safeDefine(GoogleCastElement);

declare global {
  interface HTMLElementTagNameMap {
    [GoogleCastElement.tagName]: GoogleCastElement;
  }
}
