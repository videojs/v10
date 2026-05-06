import { getSeekIndicatorDisplayValue, SeekIndicatorCore, SeekIndicatorDataAttrs } from '@videojs/core';
import { createTransition } from '@videojs/core/dom';
import type { PropertyDeclarationMap } from '@videojs/element';

import { InputIndicatorElement } from '../input-indicators/input-indicator-element';
import { LiveIndicator } from '../input-indicators/live-indicator';

export class SeekIndicatorElement extends InputIndicatorElement<SeekIndicatorCore.State> {
  static readonly tagName = 'media-seek-indicator';

  static override properties = {
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<'closeDelay'>;

  closeDelay: number | undefined;

  readonly #core = new SeekIndicatorCore();
  readonly #transition = createTransition();
  readonly #liveIndicator = new LiveIndicator({
    host: this,
    dataAttrs: SeekIndicatorDataAttrs,
    render: renderSeekIndicator,
  });

  protected get core() {
    return this.#core;
  }

  protected get transition() {
    return this.#transition;
  }

  protected get liveIndicator() {
    return this.#liveIndicator;
  }

  protected override syncCoreProps(): void {
    this.#core.setProps({ closeDelay: this.closeDelay });
  }
}

function renderSeekIndicator(element: HTMLElement, state: SeekIndicatorCore.State): void {
  const value = element.querySelector('media-seek-indicator-value');
  if (!value) return;

  value.textContent = getSeekIndicatorDisplayValue(state);
}
