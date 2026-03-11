import { MoqMseCustomMedia } from '@videojs/core/dom/media/moq';

export class MoqVideo extends MoqMseCustomMedia {
  static getTemplateHTML(attrs: Record<string, string>): string {
    const { src, name, ...rest } = attrs;
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return super.getTemplateHTML(rest);
  }

  static get observedAttributes(): string[] {
    return [...MoqMseCustomMedia.observedAttributes, 'name'];
  }

  constructor() {
    super();
    this.attach(this.target);
  }

  attributeChangedCallback(attrName: string, oldValue: string | null, newValue: string | null): void {
    if (attrName !== 'src' && attrName !== 'name') {
      super.attributeChangedCallback(attrName, oldValue, newValue);
    }

    if (attrName === 'src' && oldValue !== newValue) {
      this.src = newValue ?? '';
    } else if (attrName === 'name' && oldValue !== newValue) {
      this.name = newValue ?? '';
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();

    if (!this.hasAttribute('keep-alive')) {
      this.destroy();
    }
  }
}
