import { MuxDataElement } from '../../extensions/mux-data';
import { safeDefine } from '../../registration/safe-define';

export { MuxDataElement };

safeDefine(MuxDataElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxDataElement.tagName]: MuxDataElement;
  }
}
