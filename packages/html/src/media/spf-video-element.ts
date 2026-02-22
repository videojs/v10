import { SpfMediaMixin } from '@videojs/core/dom/media/spf';
import { CustomMediaMixin } from '../ui/custom-media-element';

export class SpfVideo extends SpfMediaMixin(CustomMediaMixin(HTMLElement, { tag: 'video' })) {
  static getTemplateHTML(attrs: Record<string, string>): string {
    const { src, ...rest } = attrs;
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return super.getTemplateHTML(rest);
  }

  constructor() {
    super();
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
