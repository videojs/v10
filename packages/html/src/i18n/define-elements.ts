import { ReactiveElement } from '@videojs/element';

import { safeDefine } from '../define/safe-define';
import { I18nProviderMixin, I18nTextMixin } from './instance';

export class MediaI18nProviderElement extends I18nProviderMixin(ReactiveElement) {
  static readonly tagName = 'media-i18n-provider';
}

safeDefine(MediaI18nProviderElement);

export class MediaTextElement extends I18nTextMixin(ReactiveElement) {
  static readonly tagName = 'media-text';
}

safeDefine(MediaTextElement);

declare global {
  interface HTMLElementTagNameMap {
    [MediaI18nProviderElement.tagName]: MediaI18nProviderElement;
    [MediaTextElement.tagName]: MediaTextElement;
  }
}
