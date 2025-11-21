import type { PreviewTimeDisplayState } from '@videojs/core/store';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { previewTimeDisplayStateDefinition } from '@videojs/core/store';

import { formatDisplayTime } from '@videojs/utils';
import { toConnectedHTMLComponent } from '../utils/component-factory';

export const getPreviewTimeDisplayState: StateHook<PreviewTimeDisplay, PreviewTimeDisplayState> = (_element, mediaStore) => {
  return {
    ...previewTimeDisplayStateDefinition.stateTransform(mediaStore.getState()),
    // Preview time display is read-only, so no request methods needed
  };
};

export const getPreviewTimeDisplayProps: PropsHook<PreviewTimeDisplay, PreviewTimeDisplayState> = (_element, _state) => {
  return {};
};

export class PreviewTimeDisplay extends HTMLElement {
  static shadowRootOptions = {
    mode: 'open' as ShadowRootMode,
  };

  static observedAttributes: string[] = ['show-remaining'];

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof PreviewTimeDisplay).shadowRootOptions);
    }
  }

  get showRemaining(): boolean {
    return this.hasAttribute('show-remaining');
  }

  _update(_props: any, state: PreviewTimeDisplayState): void {
    /** @TODO Should this live here or elsewhere? (CJP) */
    const timeLabel = formatDisplayTime(state.previewTime);

    if (this.shadowRoot) {
      this.shadowRoot.textContent = timeLabel;
    }
  }
}

export const PreviewTimeDisplayElement: ConnectedComponentConstructor<PreviewTimeDisplay, PreviewTimeDisplayState> = toConnectedHTMLComponent(
  PreviewTimeDisplay,
  getPreviewTimeDisplayState,
  getPreviewTimeDisplayProps,
  'PreviewTimeDisplay',
);
