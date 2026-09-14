import { describe, expect, it } from 'vite-plus/test';

import { renderShadowTemplate } from '../shadow-template';

let tagCounter = 0;

function define<Element extends CustomElementConstructor>(Ctor: Element): Element {
  customElements.define(`test-shadow-template-${tagCounter++}`, Ctor);

  return Ctor;
}

describe('renderShadowTemplate', () => {
  it("renders the element constructor's template with the supplied context", () => {
    class TestElement extends HTMLElement {
      static template = ({ label }: { label: string }) => `<span>${label}</span>`;

      constructor() {
        super();
        renderShadowTemplate(this, { label: 'Player' });
      }
    }

    const Ctor = define(TestElement);
    const element = new Ctor();

    expect(element.shadowRoot?.textContent).toBe('Player');
  });

  it('leaves an existing shadow root unchanged', () => {
    class TestElement extends HTMLElement {
      static template = () => '<span>replacement</span>';

      constructor() {
        super();
        this.attachShadow({ mode: 'open' }).innerHTML = '<span>existing</span>';
        renderShadowTemplate(this, undefined);
      }
    }

    const Ctor = define(TestElement);
    const element = new Ctor();

    expect(element.shadowRoot?.textContent).toBe('existing');
  });

  it('uses a subclass template', () => {
    class BaseElement extends HTMLElement {
      static template = () => '<span>base</span>';

      constructor() {
        super();
        renderShadowTemplate(this, undefined);
      }
    }

    class TestElement extends BaseElement {
      static override template = () => '<span>subclass</span>';
    }

    const Ctor = define(TestElement);
    const element = new Ctor();

    expect(element.shadowRoot?.textContent).toBe('subclass');
  });

  it('reports a missing template function', () => {
    class TestElement extends HTMLElement {
      constructor() {
        super();
        renderShadowTemplate(this, undefined);
      }
    }

    const Ctor = define(TestElement);

    expect(() => new Ctor()).toThrow(
      '[videojs] renderShadowTemplate requires the element constructor to define a template function.'
    );
  });
});
