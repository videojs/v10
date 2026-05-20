import {
  getStatusIndicatorDisplayValue,
  type InputAction,
  StatusIndicatorCore,
  StatusIndicatorDataAttrs,
} from '@videojs/core';
import { createTransition } from '@videojs/core/dom';
import type { PropertyDeclarationMap } from '@videojs/element';

import { InputIndicatorElement } from '../input-indicators/input-indicator-element';
import { LiveIndicator } from '../input-indicators/live-indicator';

/** Custom element shell for the `<media-status-indicator>` tag — transient on-screen badge for input actions like mute or fullscreen toggle. */
export class StatusIndicatorElement extends InputIndicatorElement<StatusIndicatorCore.State> {
  /** Custom element tag name. */
  static readonly tagName = 'media-status-indicator';

  static override properties = {
    actions: { type: String },
    closeDelay: { type: Number, attribute: 'close-delay' },
  } satisfies PropertyDeclarationMap<'actions' | 'closeDelay'>;

  /** Whitespace- or comma-separated list of input actions this indicator responds to. */
  actions: string | undefined;
  /** Milliseconds the indicator stays visible after the action fires. */
  closeDelay: number | undefined;

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
    this.#core.setProps({ actions: parseActions(this.actions), closeDelay: this.closeDelay });
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
