import { MuxDataElement } from '../../media/mux-data';
import { safeDefine } from '../../registration/safe-define';

safeDefine(MuxDataElement);

declare global {
  interface HTMLElementTagNameMap {
    [MuxDataElement.tagName]: MuxDataElement;
  }
}
