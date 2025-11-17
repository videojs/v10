import type { MediaStore, PreviewTimeDisplayState } from '@videojs/core/store';
import type { ConnectedComponentConstructor, PropsHook } from '../utils/component-factory';

import { previewTimeDisplayStateDefinition } from '@videojs/core/store';

import { formatDisplayTime } from '@videojs/utils';
import { toConnectedHTMLComponent } from '../utils/component-factory';

export class PreviewTimeDisplay extends HTMLElement {
  static shadowRootOptions = {
    mode: 'open' as ShadowRootMode,
  };

  static observedAttributes: string[] = ['show-remaining'];

  _state:
    | {
      previewTime: number | undefined;
    }
    | undefined;

  constructor() {
    super();

    if (!this.shadowRoot) {
      this.attachShadow((this.constructor as typeof PreviewTimeDisplay).shadowRootOptions);
    }
  }

  get previewTime(): number {
    return this._state?.previewTime ?? 0;
  }

  get showRemaining(): boolean {
    return this.hasAttribute('show-remaining');
  }

  attributeChangedCallback(name: string, _oldValue: string | null, _newValue: string | null): void {
    if (name === 'show-remaining' && this._state) {
      // Re-render with current state when show-remaining attribute changes
      this._update({}, this._state);
    }
  }

  _update(_props: any, state: any): void {
    this._state = state;

    /** @TODO Should this live here or elsewhere? (CJP) */
    const timeLabel = formatDisplayTime(state.previewTime);

    if (this.shadowRoot) {
      this.shadowRoot.textContent = timeLabel;
    }
  }
}

export function getPreviewTimeDisplayState(mediaStore: MediaStore): {
  previewTime: number | undefined;
} {
  return {
    ...previewTimeDisplayStateDefinition.stateTransform(mediaStore.getState()),
    // Preview time display is read-only, so no request methods needed
  };
}

export const getPreviewTimeDisplayProps: PropsHook<{
  previewTime: number | undefined;
}> = (_state, _element) => {
  const baseProps: Record<string, any> = {};
  return baseProps;
};

export const PreviewTimeDisplayElement: ConnectedComponentConstructor<PreviewTimeDisplayState> = toConnectedHTMLComponent(
  PreviewTimeDisplay,
  getPreviewTimeDisplayState,
  getPreviewTimeDisplayProps,
  'PreviewTimeDisplay',
);
