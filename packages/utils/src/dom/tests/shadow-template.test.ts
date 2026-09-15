import { describe, expect, it } from 'vite-plus/test';

import { renderShadowTemplate } from '../shadow-template';

let tagCounter = 0;

function define<Element extends CustomElementConstructor>(Ctor: Element): Element {
  customElements.define(`test-shadow-template-${tagCounter++}`, Ctor);

  return Ctor;
}

describe('renderShadowTemplate', () => {
  it('renders the supplied template with its context', () => {
    class TestElement extends HTMLElement {
      constructor() {
        super();
        renderShadowTemplate(this, {
          template: ({ label }) => `<span>${label}</span>`,
          context: { label: 'Player' },
        });
      }
    }

    const Ctor = define(TestElement);
    const element = new Ctor();

    expect(element.shadowRoot?.textContent).toBe('Player');
  });

  it('leaves an existing shadow root unchanged', () => {
    class TestElement extends HTMLElement {
      constructor() {
        super();
        this.attachShadow({ mode: 'open' }).innerHTML = '<span>existing</span>';
        renderShadowTemplate(this, { template: () => '<span>replacement</span>', context: undefined });
      }
    }

    const Ctor = define(TestElement);
    const element = new Ctor();

    expect(element.shadowRoot?.textContent).toBe('existing');
  });

  it('uses the supplied shadow root options', () => {
    class TestElement extends HTMLElement {
      constructor() {
        super();
        renderShadowTemplate(this, {
          template: () => '<span>closed</span>',
          context: undefined,
          shadowRootOptions: { mode: 'closed' },
        });
      }
    }

    const Ctor = define(TestElement);
    const element = new Ctor();

    expect(element.shadowRoot).toBeNull();
  });
});
