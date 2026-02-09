import type { PropertyValues } from '@lit/reactive-element';
import { TimeCore, TimeDataAttrs, type TimeType } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectTime } from '@videojs/core/dom';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class TimeElement extends MediaElement {
  static readonly tagName = 'media-time';

  static override properties = {
    type: { type: String },
    negativeSign: { type: String, attribute: 'negative-sign' },
    label: { type: String },
  };

  type: TimeType = 'current';
  negativeSign = '-';
  label = '';

  readonly #core = new TimeCore();
  readonly #state = new PlayerController(this, playerContext, selectTime);

  readonly #signSpan = document.createElement('span');
  readonly #textNode = document.createTextNode('');

  constructor() {
    super();
    this.#signSpan.setAttribute('aria-hidden', 'true');
  }

  override connectedCallback(): void {
    super.connectedCallback();
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#state.value;

    if (!media) {
      logMissingFeature(TimeElement.tagName, 'time');
      return;
    }

    const state = this.#core.getState(media);

    if (state.negative) {
      this.#signSpan.textContent = this.negativeSign;
      this.#textNode.textContent = state.text;

      // Append elements if not already in DOM
      if (!this.#signSpan.parentNode) {
        this.textContent = '';
        this.appendChild(this.#signSpan);
        this.appendChild(this.#textNode);
      }
    } else {
      // Remove sign span if present, use direct text
      if (this.#signSpan.parentNode) {
        this.#signSpan.remove();
        this.#textNode.remove();
      }
      this.textContent = state.text;
    }

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, TimeDataAttrs);
  }
}
