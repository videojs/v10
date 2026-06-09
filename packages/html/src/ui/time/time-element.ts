import { TimeCore, TimeDataAttrs, type TimeType } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectTime } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { isInteractiveActivation } from '@videojs/utils/dom';
import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class TimeElement extends MediaElement {
  static readonly tagName = 'media-time';

  static override properties = {
    type: { type: String },
    negativeSign: { type: String, attribute: 'negative-sign' },
    label: { type: String },
    toggle: { type: Boolean },
  } satisfies PropertyDeclarationMap<keyof TimeCore.Props>;

  type: TimeType = TimeCore.defaultProps.type;
  negativeSign = TimeCore.defaultProps.negativeSign;
  label = TimeCore.defaultProps.label;
  toggle = TimeCore.defaultProps.toggle;

  readonly #core = new TimeCore();
  readonly #state = new PlayerController(this, playerContext, selectTime);

  readonly #signSpan = document.createElement('span');
  readonly #textNode = document.createTextNode('');

  #disconnect: AbortController | null = null;
  #listening = false;
  #activeType: TimeType = TimeCore.defaultProps.type;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#disconnect = new AbortController();
    this.#syncListeners();

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

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
    this.#listening = false;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    if (changed.has('type') || changed.has('toggle')) {
      this.#activeType = this.type;
    }
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    if (changed.has('toggle')) {
      this.#syncListeners();
    }

    const media = this.#state.value;
    if (!media) {
      this.#clearAttrs();
      return;
    }

    this.#core.setProps({
      type: this.toggle ? this.#activeType : this.type,
      negativeSign: this.negativeSign,
      label: this.label,
      toggle: this.toggle,
    });
    this.#core.setMedia(media);
    const state = this.#core.getState();

    this.#signSpan.hidden = !state.negative;
    this.#signSpan.textContent = state.negative ? this.negativeSign : '';
    this.#textNode.textContent = state.text;

    applyElementProps(this, this.#core.getAttrs(state, this.type));
    applyStateDataAttrs(this, state, TimeDataAttrs);
  }

  #handleClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || !this.toggle || !this.#state.value) return;
    this.#toggleType();
  };

  #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.defaultPrevented || !isInteractiveActivation(event)) return;
    if (!this.toggle || !this.#state.value) return;
    // Prevent space from scrolling page.
    event.preventDefault();
    if (event.repeat) return;
    this.#toggleType();
  };

  #toggleType(): void {
    if (this.type === 'current') {
      this.#activeType = this.#activeType === 'remaining' ? 'current' : 'remaining';
    } else {
      this.#activeType = this.#activeType === 'duration' ? 'remaining' : 'duration';
    }

    this.requestUpdate();
  }

  #syncListeners(): void {
    if (!this.toggle || !this.#disconnect || this.#listening) return;

    this.#listening = true;
    applyElementProps(
      this,
      {
        onClick: this.#handleClick,
        onKeyDown: this.#handleKeyDown,
      },
      { signal: this.#disconnect.signal }
    );
  }

  #clearAttrs(): void {
    applyElementProps(this, {
      'aria-label': undefined,
      'aria-valuetext': undefined,
      role: undefined,
      tabIndex: undefined,
      'data-type': undefined,
    });
  }
}
