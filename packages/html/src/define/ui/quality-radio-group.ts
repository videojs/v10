import { safeDefine } from '../../registration/safe-define';
import { QualityRadioGroupElement } from '../../ui/quality-radio-group/quality-radio-group-element';

safeDefine(QualityRadioGroupElement);

declare global {
  interface HTMLElementTagNameMap {
    [QualityRadioGroupElement.tagName]: QualityRadioGroupElement;
  }
}
