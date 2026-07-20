import {
  createInputIndicatorLabels,
  getStatusIndicatorDisplayValue,
  type InputAction,
  StatusIndicatorCore,
  StatusIndicatorDataAttrs,
} from '@videojs/core';
import { createTransition } from '@videojs/core/dom';
import type { PropertyDeclarationMap } from '@videojs/element';

import { i18nContext } from '../../i18n/context';
import { I18nController } from '../../i18n/controller';
import { InputIndicatorElement } from '../input-indicators/input-indicator-element';
import { LiveIndicator } from '../input-indicators/live-indicator';

export class StatusIndicatorElement extends InputIndicatorElement<StatusIndicatorCore.State> {
  static readonly tagName = 'media-status-indicator';

  static override properties = {
    actions: { type: String },
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<'actions' | 'closeDelay'>;

  actions: string | undefined;
  closeDelay: number | undefined;

  readonly #i18n = new I18nController(this, i18nContext);
  readonly #core = new StatusIndicatorCore();
  readonly #transition = createTransition();
  readonly #liveIndicator = new LiveIndicator({
    host: this,
    dataAttrs: StatusIndicatorDataAttrs,
    render: renderStatusIndicator,
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
    this.#core.setProps({
      actions: parseActions(this.actions),
      closeDelay: this.closeDelay,
      labels: createInputIndicatorLabels(this.#i18n.value),
    });
  }
}

function parseActions(actions: string | undefined): readonly InputAction[] | undefined {
  return actions?.split(/[\s,]+/).filter(Boolean) as readonly InputAction[] | undefined;
}

function renderStatusIndicator(element: HTMLElement, state: StatusIndicatorCore.State): void {
  const value = element.querySelector('media-status-indicator-value');
  if (!value) return;

  value.textContent = getStatusIndicatorDisplayValue(state);
}
