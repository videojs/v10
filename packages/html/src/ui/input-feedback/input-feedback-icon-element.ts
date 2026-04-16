import type { PropertyValues } from '@videojs/element';
import { ContextConsumer } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { inputFeedbackItemContext } from './context';

export class InputFeedbackIconElement extends MediaElement {
  static readonly tagName = 'media-input-feedback-icon';

  readonly #consumer = new ContextConsumer(this, { context: inputFeedbackItemContext, subscribe: true });

  #lastGeneration = 0;
  #templateChildren: Node[] | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed || this.#templateChildren) return;
    if (!this.style.display) this.style.display = 'contents';
    this.#templateChildren = Array.from(this.childNodes).map((node) => node.cloneNode(true));
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const ctx = this.#consumer.value;
    if (!ctx) return;

    const { generation } = ctx.state;
    if (generation === this.#lastGeneration) return;

    this.#lastGeneration = generation;

    if (!this.#templateChildren?.length) return;
    this.replaceChildren(...this.#templateChildren.map((node) => node.cloneNode(true)));
  }
}
