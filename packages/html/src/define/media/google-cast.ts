import { GoogleCastElement } from '../../media/google-cast';
import { safeDefine } from '../safe-define';

export { GoogleCastElement };

safeDefine(GoogleCastElement);

declare global {
  interface HTMLElementTagNameMap {
    [GoogleCastElement.tagName]: GoogleCastElement;
  }
}
