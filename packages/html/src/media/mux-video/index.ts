import { MuxCustomMedia } from '@videojs/core/dom/media/mux';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class MuxVideo extends MediaAttachMixin(MuxCustomMedia) {
  static get observedAttributes() {
    // biome-ignore lint/complexity/noThisInStatic: intentional use of super
    return [...super.observedAttributes, 'drm-token'];
  }

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

    if (attrName === 'drm-token' && oldValue !== newValue) {
      this.drmToken = newValue;
    }
  }

  disconnectedCallback(): void {
    super.disconnectedCallback?.();

    if (!this.hasAttribute('keep-alive')) {
      this.destroy();
    }
  }
}
