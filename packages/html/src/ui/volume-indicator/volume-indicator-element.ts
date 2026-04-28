import {
  getVolumeIndicatorDisplayValue,
  VolumeIndicatorCore,
  VolumeIndicatorCSSVars,
  VolumeIndicatorDataAttrs,
} from '@videojs/core';
import { createTransition } from '@videojs/core/dom';
import type { PropertyDeclarationMap } from '@videojs/element';

import { InputIndicatorElement } from '../input-indicators/input-indicator-element';
import { LiveIndicator } from '../input-indicators/live-indicator';

export class VolumeIndicatorElement extends InputIndicatorElement<VolumeIndicatorCore.State> {
  static readonly tagName = 'media-volume-indicator';

  static override properties = {
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<'closeDelay'>;

  closeDelay: number | undefined;

  readonly #core = new VolumeIndicatorCore();
  readonly #transition = createTransition();
  readonly #liveIndicator = new LiveIndicator({
    host: this,
    dataAttrs: VolumeIndicatorDataAttrs,
    render: renderVolumeIndicator,
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

function renderVolumeIndicator(element: HTMLElement, state: VolumeIndicatorCore.State): void {
  const fill = element.querySelector<HTMLElement>('media-volume-indicator-fill');
  const value = element.querySelector('media-volume-indicator-value');

  if (state.fill) {
    fill?.style.setProperty(VolumeIndicatorCSSVars.fill, state.fill);
  } else {
    fill?.style.removeProperty(VolumeIndicatorCSSVars.fill);
  }

  if (value) {
    value.textContent = getVolumeIndicatorDisplayValue(state);
  }
}
