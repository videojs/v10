import type { InferComponentState, InferMediaState, MediaButtonComponent, StateAttrMap } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, createButton, logMissingFeature } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import type { PlayerController } from '../player/player-controller';
import { MediaElement } from './media-element';
import type { TooltipLabelProvider } from './tooltip/tooltip-element';

/** Abstract base for HTML custom elements that render a media-control button. */
export abstract class MediaButtonElement<Core extends MediaButtonComponent>
  extends MediaElement
  implements TooltipLabelProvider
{
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
  #suppressLabel = false;

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

  /** Called by the tooltip element to suppress the button's own aria-label. */
  setSuppressLabel(value: boolean): void {
    this.#suppressLabel = value;
    this.core.setSuppressLabel(value);
    this.requestUpdate();
  }

  /** Returns the button's current label derived from media state. */
  getLabel(): string | undefined {
    const media = this.mediaState.value;
    if (!media) return undefined;
    this.core.setMedia(media);
    return this.core.getLabel(this.core.getState());
  }

  protected override willUpdate(changed: PropertyValues): void {
    super.willUpdate(changed);
    this.core.setProps?.(this);
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.mediaState.value;

    if (!media) return;

    this.core.setMedia(media);
    this.core.setSuppressLabel(this.#suppressLabel);
    const state = this.core.getState();
    applyElementProps(this, this.core.getAttrs?.(state) ?? {});
    applyStateDataAttrs(this, state, this.stateAttrMap);
  }
}
