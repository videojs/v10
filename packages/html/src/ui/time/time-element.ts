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

    if (!this.#state.value) {
      logMissingFeature(TimeElement.tagName, 'time');
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps({ type: this.type, negativeSign: this.negativeSign, label: this.label });
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const time = this.#state.value;

    if (!time) {
      return;
    }

    const state = this.#core.getState(time);
    const showSign = state.type === 'remaining' && state.seconds < 0;

    if (showSign) {
      this.#signSpan.textContent = this.negativeSign;
      this.#textNode.textContent = state.text.replace(/^-/, '');

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

    applyElementProps(this, this.#core.getAttrs(time));
    applyStateDataAttrs(this, state, TimeDataAttrs);
  }
}
