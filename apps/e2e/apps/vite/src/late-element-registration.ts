import { ReactiveElement } from '@videojs/html';

interface LateReactiveElement extends ReactiveElement {
  label: string;
  connectedLabel: string | undefined;
  renderedLabel: string | undefined;
  updateCount: number;
}

declare global {
  interface Window {
    lateRegistrationComplete: Promise<LateReactiveElement>;
  }
}

const element = document.querySelector<LateReactiveElement>('late-reactive-element');
if (!element) throw new Error('Late reactive element was not found');

element.label = 'pre-upgrade';

class TestElement extends ReactiveElement {
  static override properties = {
    label: { type: String },
  };

  label = 'default';
  connectedLabel: string | undefined;
  renderedLabel: string | undefined;
  updateCount = 0;

  override connectedCallback(): void {
    super.connectedCallback();
    this.connectedLabel = this.label;
  }

  protected override update(): void {
    this.renderedLabel = this.label;
    this.updateCount++;
  }
}

customElements.define('late-reactive-element', TestElement);

element.label = 'newer';
window.lateRegistrationComplete = element.updateComplete.then(() => element);
