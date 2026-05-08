import { CaptionsMenuCore, CaptionsMenuDataAttrs } from '@videojs/core';
import { applyElementProps, applyStateDataAttrs, logMissingFeature, selectTextTrack } from '@videojs/core/dom';
import type { PropertyDeclarationMap, PropertyValues } from '@videojs/element';

import { playerContext } from '../../player/context';
import { PlayerController } from '../../player/player-controller';
import { MediaElement } from '../media-element';

export class CaptionsMenuTriggerElement extends MediaElement {
  static readonly tagName = 'media-captions-menu-trigger';

  static override properties = {
    label: { type: String },
    offLabel: { type: String, attribute: 'off-label' },
    disabled: { type: Boolean },
    commandfor: { type: String },
  } satisfies PropertyDeclarationMap<'label' | 'offLabel' | 'disabled' | 'commandfor'>;

  label = '';
  offLabel = CaptionsMenuCore.defaultProps.offLabel;
  disabled = false;
  commandfor: string | undefined = undefined;
  formatTrack = CaptionsMenuCore.defaultProps.formatTrack;

  readonly #core = new CaptionsMenuCore();
  readonly #mediaState = new PlayerController(this, playerContext, selectTextTrack);

  #disconnect: AbortController | null = null;

  override connectedCallback(): void {
    super.connectedCallback();
    if (this.destroyed) return;

    this.#disconnect = new AbortController();
    applyElementProps(
      this,
      {
        onClick: this.#handleClick,
        onKeyDown: this.#handleKeyDown,
      },
      { signal: this.#disconnect.signal }
    );

    if (__DEV__ && !this.#mediaState.value && this.#mediaState.displayName) {
      logMissingFeature(this.localName, this.#mediaState.displayName);
    }
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    this.#disconnect?.abort();
    this.#disconnect = null;
  }

  /** Returns the trigger's current label derived from media state. */
  getLabel(): string | undefined {
    return this.#core.state.current.label || undefined;
  }

  protected override update(changed: PropertyValues): void {
    super.update(changed);

    const media = this.#mediaState.value;
    if (!media) return;

    this.#core.setProps(this);
    this.#core.setMedia(media);
    const state = this.#core.getState();

    applyElementProps(this, {
      role: 'button',
      tabIndex: 0,
      ...this.#core.getAttrs(state),
    });
    applyStateDataAttrs(this, state, CaptionsMenuDataAttrs);
  }

  #handleClick = (event: MouseEvent): void => {
    if (this.#mediaState.value && !this.#core.state.current.disabled) return;

    event.preventDefault();
    event.stopImmediatePropagation();
  };

  #handleKeyDown = (event: KeyboardEvent): void => {
    if (event.target !== event.currentTarget) return;

    if (!this.#mediaState.value || this.#core.state.current.disabled) {
      if (event.key !== 'Tab') event.preventDefault();
      return;
    }

    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.click();
    }
  };
}

export namespace CaptionsMenuTriggerElement {
  export type State = CaptionsMenuCore.State;
}
