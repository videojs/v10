import { GoogleCastElement } from '../../media/google-cast';
import { safeDefine } from '../../registration/safe-define';

export { GoogleCastElement };

safeDefine(GoogleCastElement);

declare global {
  interface HTMLElementTagNameMap {
    [GoogleCastElement.tagName]: GoogleCastElement;
  }
}
