import { QualityRadioGroupElement } from '../../ui/quality-radio-group/quality-radio-group-element';
import { safeDefine } from '../safe-define';

safeDefine(QualityRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [QualityRadioGroupElement.tagName]: QualityRadioGroupElement;
  }
}
