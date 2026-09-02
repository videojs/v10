import { MuxDataExtension } from '../../extensions/mux-data';
import { safeDefine } from '../../registration/safe-define';

export { MuxDataExtension };

safeDefine(MuxDataExtension);

declare global {
  interface HTMLElementTagNameMap {
    [MuxDataExtension.tagName]: MuxDataExtension;
  }
}
