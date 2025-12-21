export function getTemplateHTML() {
  return /* html */ `
    <style>
      :host {
        display: block;
      }

      media-container {
        display: block;
        width: 100%;
        height: 100%;
      }
    </style>
    <slot></slot>
  `;
}

export class MediaSkinElement extends HTMLElement {
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static getTemplateHTML: () => string = getTemplateHTML;

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof MediaSkinElement).shadowRootOptions);
      this.shadowRoot!.innerHTML = (this.constructor as typeof MediaSkinElement).getTemplateHTML();
    }
  }
}
