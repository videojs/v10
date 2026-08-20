import { MuxDataElement } from '../../media/mux-data';
import { safeDefine } from '../safe-define';

export { MuxDataElement };

safeDefine(MuxDataElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxDataElement.tagName]: MuxDataElement;
  }
}
