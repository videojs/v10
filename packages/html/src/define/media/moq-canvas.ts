import { MoqCanvas } from '../../media/moq-canvas';
import { safeDefine } from '../safe-define';

export class MoqCanvasElement extends MoqCanvas {
  static readonly tagName = 'moq-canvas';
}

safeDefine(MoqCanvasElement);

declare global {
  interface HTMLElementTagNameMap {
    [MoqCanvasElement.tagName]: MoqCanvasElement;
  }
}
