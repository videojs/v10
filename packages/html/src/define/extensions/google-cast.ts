import { GoogleCastExtension } from '../../extensions/google-cast';
import { safeDefine } from '../../registration/safe-define';

export { GoogleCastExtension };

safeDefine(GoogleCastExtension);

declare global {
  interface HTMLElementTagNameMap {
    [GoogleCastExtension.tagName]: GoogleCastExtension;
  }
}
