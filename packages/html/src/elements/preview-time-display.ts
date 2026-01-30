import { formatDisplayTime } from '@videojs/utils';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';
import { toConnectedHTMLComponent } from '../utils/component-factory';

type PreviewTimeDisplayState = {
  previewTime: number;
};

/**
 * PreviewTimeDisplay state hook - equivalent to React's usePreviewTimeDisplayState
 * Handles player store state subscription and transformation
 */
export const getPreviewTimeDisplayState: StateHook<PreviewTimeDisplay, PreviewTimeDisplayState> = (
  _element,
  playerStore
) => {
  const state = playerStore.getState();
  return {
    previewTime: state.previewTime,
  };
};

export const getPreviewTimeDisplayProps: PropsHook<PreviewTimeDisplay, PreviewTimeDisplayState> = (
  _element,
  _state
) => {
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

export const PreviewTimeDisplayElement: ConnectedComponentConstructor<PreviewTimeDisplay, PreviewTimeDisplayState> =
  toConnectedHTMLComponent(
    PreviewTimeDisplay,
    getPreviewTimeDisplayState,
    getPreviewTimeDisplayProps,
    'PreviewTimeDisplay'
  );
