export function getTemplateHTML() {
  return /* html */ `
    <style>
      :host {
        display: inline-block;
      }
      svg {
        fill: currentColor;
      }
    </style>
  `;
}

export class MediaChromeIcon extends HTMLElement {
  static shadowRootOptions = { mode: 'open' as ShadowRootMode };
  static getTemplateHTML: () => string = getTemplateHTML;

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof MediaChromeIcon).shadowRootOptions);
      this.shadowRoot!.innerHTML = (this.constructor as typeof MediaChromeIcon).getTemplateHTML();
    }
  }
}
