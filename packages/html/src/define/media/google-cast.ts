import { GoogleCastElement } from '../../media/google-cast';
import { safeDefine } from '../safe-define';

safeDefine(GoogleCastElement);

declare global {
  interface HTMLElementTagNameMap {
    [GoogleCastElement.tagName]: GoogleCastElement;
  }
}
