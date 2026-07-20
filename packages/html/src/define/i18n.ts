import { I18nProviderElement } from '../i18n/provider-element';
import { TextElement } from '../ui/text/text-element';
import { safeDefine } from './safe-define';

safeDefine(I18nProviderElement);
safeDefine(TextElement);

declare global {
  interface HTMLElementTagNameMap {
    [I18nProviderElement.tagName]: I18nProviderElement;
    [TextElement.tagName]: TextElement;
  }
}
