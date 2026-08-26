import { I18nProviderElement } from '../i18n/provider-element';
import { safeDefine } from '../registration/safe-define';
import { TextElement } from '../ui/text/text-element';

safeDefine(I18nProviderElement);
safeDefine(TextElement);

declare global {
  interface HTMLElementTagNameMap {
    [I18nProviderElement.tagName]: I18nProviderElement;
    [TextElement.tagName]: TextElement;
  }
}
