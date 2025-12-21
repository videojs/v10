import { namedNodeMapToObject } from '@videojs/utils/dom';

export function getTemplateHTML(
  this: typeof ButtonElement,
  _attrs: Record<string, string>,
  _props: Record<string, any> = {},
): string {
  return /* html */ `
    <style>
      /*
        NOTE: Even though primitives should aim to be "unstyled" in their core definitions, we should
        still add pointer-events, as this defines functionality. (CJP)
      */
      :host {
        pointer-events: auto;
      }
    </style>
    <slot>
    </slot>
  `;
}

export class ButtonElement extends HTMLElement {
  static shadowRootOptions = {
    mode: 'open' as ShadowRootMode,
  };

  static getTemplateHTML: typeof getTemplateHTML = getTemplateHTML;

  static observedAttributes: string[] = ['commandfor'];

  constructor() {
    super();

    if (!this.shadowRoot) {
      // Set up the Shadow DOM if not using Declarative Shadow DOM.
      this.attachShadow((this.constructor as typeof ButtonElement).shadowRootOptions);

      const attrs = namedNodeMapToObject(this.attributes);
      const html = (this.constructor as typeof ButtonElement).getTemplateHTML(attrs);
      // From MDN: setHTMLUnsafe should be used instead of ShadowRoot.innerHTML
      // when a string of HTML may contain declarative shadow roots.
      const shadowRoot = this.shadowRoot as unknown as ShadowRoot;
      shadowRoot.setHTMLUnsafe ? shadowRoot.setHTMLUnsafe(html) : (shadowRoot.innerHTML = html);
    }

    this.addEventListener('click', this);
    this.addEventListener('keydown', this);
  }

  attributeChangedCallback(name: string, _oldValue: string, newValue: string): void {
    if (name === 'commandfor') {
      this.style.setProperty('anchor-name', `--${newValue}`);
    }
  }

  handleEvent(event: Event): void {
    const { type } = event;
    if (type === 'keydown') {
      this.#handleKeyDown(event as KeyboardEvent);
    }
  }

  #handleKeyDown = (event: KeyboardEvent): void => {
    const { metaKey, altKey, key } = event;
    if (metaKey || altKey || !['Enter', ' '].includes(key)) {
      this.removeEventListener('keyup', this.#handleKeyUp);
      return;
    }
    this.addEventListener('keyup', this.#handleKeyUp, { once: true });
  };

  #handleKeyUp = (_event: KeyboardEvent): void => {
    this.handleEvent({ type: 'click' } as Event);
  };
}
