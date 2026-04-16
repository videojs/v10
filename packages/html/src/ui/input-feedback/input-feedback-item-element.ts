import {
  EMPTY_INPUT_FEEDBACK_ITEM_STATE,
  getInputFeedbackItemDefinition,
  getInputFeedbackItemState,
  getRenderedInputFeedbackItemState,
  type InputFeedbackAction,
  InputFeedbackCSSVars,
  type InputFeedbackGroup,
  InputFeedbackItemDataAttrs,
  isInputFeedbackItemPresent,
  isVolumeInputFeedbackItem,
} from '@videojs/core';
import { applyStateDataAttrs, createTransition } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';
import { ContextConsumer, ContextProvider } from '@videojs/element/context';

import { MediaElement } from '../media-element';
import { inputFeedbackContext, inputFeedbackItemContext } from './context';

export class InputFeedbackItemElement extends MediaElement {
  static readonly tagName = 'media-input-feedback-item';

  static override properties = {
    action: { type: String },
    group: { type: String },
  } satisfies PropertyDeclarationMap<'action' | 'group'>;

  action: InputFeedbackAction | undefined;
  group: InputFeedbackGroup | undefined;

  readonly #consumer = new ContextConsumer(this, { context: inputFeedbackContext, subscribe: true });
  readonly #provider = new ContextProvider(this, { context: inputFeedbackItemContext });
  readonly #transition = createTransition();

  #disconnect: AbortController | null = null;
  #snapshot = EMPTY_INPUT_FEEDBACK_ITEM_STATE;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    this.#transition.state.subscribe(() => this.requestUpdate(), {
      signal: this.#disconnect.signal,
    });
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  override destroyCallback(): void {
    this.#transition.destroy();
    super.destroyCallback();
  }

  protected override update(_changed: PropertyValues): void {
    super.update(_changed);

    const ctx = this.#consumer.value;
    const definition = getInputFeedbackItemDefinition(this.action, this.group);

    if (!ctx || !definition) {
      applyStateDataAttrs(this, EMPTY_INPUT_FEEDBACK_ITEM_STATE, InputFeedbackItemDataAttrs);
      this.style.removeProperty(InputFeedbackCSSVars.volumePercentage);
      return;
    }

    const currentItemState = getInputFeedbackItemState(ctx.state, definition, ctx.currentVolumeLevel);

    if (currentItemState.active) {
      this.#snapshot = currentItemState;

      const { active, status } = this.#transition.state.current;
      if (!active || status === 'ending') {
        void this.#transition.open();
      }
    } else {
      const { active, status } = this.#transition.state.current;
      if (active && status !== 'ending') {
        void this.#transition.close(this);
      }
    }

    const itemState = getRenderedInputFeedbackItemState(
      currentItemState,
      this.#snapshot,
      this.#transition.state.current
    );

    if (
      this.hasAttribute(INPUT_FEEDBACK_LIVE_ITEM_ATTR) &&
      !isInputFeedbackItemPresent(currentItemState, this.#transition.state.current)
    ) {
      this.remove();
      return;
    }

    applyStateDataAttrs(this, itemState, InputFeedbackItemDataAttrs);
    this.#provider.setValue({ state: itemState, stateAttrMap: InputFeedbackItemDataAttrs });

    if (isVolumeInputFeedbackItem(definition)) {
      this.style.setProperty(InputFeedbackCSSVars.volumePercentage, ctx.volumePercentage);
    } else {
      this.style.removeProperty(InputFeedbackCSSVars.volumePercentage);
    }
  }
}

const INPUT_FEEDBACK_LIVE_ITEM_ATTR = 'data-input-feedback-live';
