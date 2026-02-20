import { HlsMediaMixin } from '@videojs/core/dom/media/hls';
import { CustomMediaMixin } from '../custom-media-element';

export class HlsVideo extends HlsMediaMixin(CustomMediaMixin(HTMLElement, { tag: 'video' })) {
  static getTemplateHTML(attrs: Record<string, string>): string {
    const { src, ...rest } = attrs;
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return super.getTemplateHTML(rest);
  }

  constructor() {
    super();
    // TODO: If we like to support native media elements that
    // are appended after the custom element is created, we need to
    // attach the native element to the Media API after the native element
    // is appended to the DOM. This is currently not supported.
    this.attach(this.nativeEl);
  }

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (attrName !== 'src') {
      super.attributeChangedCallback(attrName, oldValue, newValue);
    }

    if (attrName === 'src' && oldValue !== newValue) {
      this.src = newValue ?? '';
    }
  }
}
