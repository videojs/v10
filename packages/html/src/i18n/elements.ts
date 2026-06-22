import { ReactiveElement } from '@videojs/element';

import { I18nTextMixin } from './instance';
import { I18nProviderMixin } from './provider';

export class MediaI18nProviderElement extends I18nProviderMixin(ReactiveElement) {
  static readonly tagName = 'media-i18n-provider';
}

export class MediaTextElement extends I18nTextMixin(ReactiveElement) {
  static readonly tagName = 'media-text';
}
