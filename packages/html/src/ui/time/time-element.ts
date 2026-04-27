import { TimeCore, TimeDataAttrs, type TimeType } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectTime } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class TimeElement extends MediaElement {
  static readonly tagName = 'media-time';

  static override properties = {
    type: { type: String },
    negativeSign: { type: String, attribute: 'negative-sign' },
    label: { type: String },
  } satisfies PropertyDeclarationMap<keyof TimeCore.Props>;

  type: TimeType = TimeCore.defaultProps.type;
  negativeSign = TimeCore.defaultProps.negativeSign;
  label = TimeCore.defaultProps.label;

  readonly #core = new TimeCore();
  readonly #state = new PlayerController(this, playerContext, selectTime);

  readonly #signSpan = document.createElement('span');
  readonly #textNode = document.createTextNode('');

  override connectedCallback(): void {
    super.connectedCallback();

    if (!this.#signSpan.parentNode) {
      this.#signSpan.setAttribute('aria-hidden', 'true');
      this.#signSpan.hidden = true;
      this.appendChild(this.#signSpan);
      this.appendChild(this.#textNode);
    }

    if (__DEV__ && !this.#state.value) {
      logMissingFeature(this.localName, this.#state.displayName!);
    }
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.#core.setProps(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#state.value;

    if (!media) return;

    this.#core.setMedia(media);
    const state = this.#core.getState();

    this.#signSpan.hidden = !state.negative;
    this.#signSpan.textContent = state.negative ? this.negativeSign : '';
    this.#textNode.textContent = state.text;

    applyElementProps(this, this.#core.getAttrs(state));
    applyStateDataAttrs(this, state, TimeDataAttrs);
  }
}
