import { MediaI18nProviderElement, MediaTextElement } from '../i18n/elements';
import { safeDefine } from './safe-define';

safeDefine(MediaI18nProviderElement);
safeDefine(MediaTextElement);

declare global {
  interface HTMLElementTagNameMap {
    [MediaI18nProviderElement.tagName]: MediaI18nProviderElement;
    [MediaTextElement.tagName]: MediaTextElement;
  }
}
