import { SimpleHlsCustomMedia } from '@videojs/core/dom/media/simple-hls';

export class SimpleHlsVideo extends SimpleHlsCustomMedia {
  static getTemplateHTML(attrs: Record<string, string>): string {
    const { src, ...rest } = attrs;
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return super.getTemplateHTML(rest);
  }

  constructor() {
    super();
    this.attach(this.target);
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
