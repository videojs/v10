import type { InferComponentState, InferMediaState, StateAttrMap, UICore } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, createButton, logMissingFeature } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import type { PlayerController } from '../player/player-controller';
import { MediaElement } from './media-element';

/** Abstract base for HTML custom elements that render a media-control button. */
export abstract class MediaButtonElement<Core extends UICore> extends MediaElement {
  static override properties: PropertyDeclarationMap = {
    label: { type: String },
    disabled: { type: Boolean },
  };

  disabled = false;
  label = '';

  protected abstract readonly core: Core;
  protected abstract readonly stateAttrMap: StateAttrMap<InferComponentState<Core>>;
  protected abstract readonly mediaState: PlayerController<any, InferMediaState<Core> | undefined>;

  protected abstract activate(state: InferMediaState<Core>): void;

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();

    this.#disconnect = new AbortController();

    const buttonProps = createButton({
      onActivate: () => this.activate(this.mediaState.value!),
      isDisabled: () => this.disabled || !this.mediaState.value,
    });

    applyElementProps(this, buttonProps, { signal: this.#disconnect.signal });

    if (__DEV__ && !this.mediaState.value && this.mediaState.displayName) {
      logMissingFeature(this.localName, this.mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.core.setProps?.(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.mediaState.value;

    if (!media) return;

    const state = this.core.getState(media as never);
    applyElementProps(this, this.core.getAttrs?.(state) ?? {});
    applyStateDataAttrs(this, state, this.stateAttrMap as StateAttrMap<object>);
  }
}
