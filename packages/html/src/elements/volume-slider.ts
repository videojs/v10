import type { MediaStore } from '@videojs/core/store';
import type { Prettify } from '../types';

import type { ConnectedComponentConstructor, PropsHook } from '../utils/component-factory';
import { VolumeSlider as CoreVolumeSlider } from '@videojs/core';
import { volumeSliderStateDefinition } from '@videojs/core/store';

import { setAttributes } from '@videojs/utils/dom';
import { getCoreState, toConnectedHTMLComponent } from '../utils/component-factory';

type VolumeSliderState = Prettify<ReturnType<CoreVolumeSlider['getState']>>;

// ============================================================================
// ROOT COMPONENT
// ============================================================================

export function getVolumeSliderRootState(mediaStore: MediaStore): VolumeSliderState {
  const mediaState = volumeSliderStateDefinition.stateTransform(mediaStore.getState());
  const mediaMethods = volumeSliderStateDefinition.createRequestMethods(mediaStore.dispatch);
  const coreState = getCoreState(CoreVolumeSlider, { ...mediaState, ...mediaMethods });
  return {
    ...coreState,
  };
}

/**
 * VolumeSlider Root props hook - equivalent to React's useVolumeSliderRootProps
 * Handles element attributes and properties based on state
 */
export const getVolumeSliderRootProps: PropsHook<VolumeSliderState> = (state, element) => {
  if (state._rootElement !== element) {
    state._setRootElement(element);
  }

  const volumeText = `${Math.round(state.muted ? 0 : state.volume * 100)}%`;

  return {
    role: 'slider',
    tabindex: element.getAttribute('tabindex') ?? '0',
    'data-muted': state.muted.toString(),
    'data-volume-level': state.volumeLevel,
    'data-orientation': (element as any).orientation || 'horizontal',
    'aria-label': 'Volume',
    'aria-valuemin': '0',
    'aria-valuemax': '100',
    'aria-valuenow': Math.round(state.muted ? 0 : state.volume * 100).toString(),
    'aria-valuetext': volumeText,
    'aria-orientation': (element as any).orientation || 'horizontal',
  };
};

export class VolumeSliderRoot extends HTMLElement {
  static readonly observedAttributes: readonly string[] = [
    'commandfor',
    'orientation',
  ];

  _state: VolumeSliderState | undefined;

  get volume(): number {
    return this._state?.volume ?? 0;
  }

  get muted(): boolean {
    return this._state?.muted ?? false;
  }

  get volumeLevel(): string {
    return this._state?.volumeLevel ?? 'high';
  }

  get orientation(): 'horizontal' | 'vertical' {
    return (this.getAttribute('orientation') as 'horizontal' | 'vertical') || 'horizontal';
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'orientation' && this._state) {
      this._update(getVolumeSliderRootProps(this._state, this), this._state);
    } else if (name === 'commandfor') {
      this.style.setProperty('anchor-name', `--${newValue}`);
    }
  }

  _update(props: any, state: VolumeSliderState): void {
    this._state = state;

    this.style.setProperty('--slider-fill', `${state._fillWidth.toFixed(3)}%`);

    setAttributes(this, props);
  }
}

export const VolumeSliderRootElement: ConnectedComponentConstructor<VolumeSliderState>
  = toConnectedHTMLComponent(
    VolumeSliderRoot,
    getVolumeSliderRootState,
    getVolumeSliderRootProps,
    'VolumeSliderRoot',
  );

// ============================================================================
// TRACK COMPONENT
// ============================================================================

export const getVolumeSliderTrackProps: PropsHook<Record<string, never>> = (_state, element) => {
  const rootElement = element.closest('media-volume-slider') as any;
  return {
    'data-orientation': rootElement?.orientation || 'horizontal',
  };
};

export class VolumeSliderTrack extends HTMLElement {
  connectedCallback(): void {
    const rootElement = this.closest('media-volume-slider') as any;
    rootElement._state._setTrackElement(this);
  }

  _update(props: any, _state: any): void {
    setAttributes(this, props);

    if (props['data-orientation'] === 'horizontal') {
      this.style.width = '100%';
      this.style.removeProperty('height');
    } else {
      this.style.height = '100%';
      this.style.removeProperty('width');
    }
  }
}

export const VolumeSliderTrackElement: ConnectedComponentConstructor<any> = toConnectedHTMLComponent(
  VolumeSliderTrack,
  undefined,
  getVolumeSliderTrackProps,
  'VolumeSliderTrack',
);

// ============================================================================
// INDICATOR COMPONENT
// ============================================================================

export const getVolumeSliderIndicatorProps: PropsHook<Record<string, never>> = (_state, element) => {
  const rootElement = element.closest('media-volume-slider') as any;
  return {
    'data-orientation': rootElement?.orientation || 'horizontal',
  };
};

export class VolumeSliderIndicator extends HTMLElement {
  constructor() {
    super();
    this.style.position = 'absolute';
    this.style.width = 'var(--slider-fill, 0%)';
    this.style.height = '100%';
  }

  _update(props: any, _state: any): void {
    setAttributes(this, props);

    if (props['data-orientation'] === 'horizontal') {
      this.style.width = 'var(--slider-fill, 0%)';
      this.style.height = '100%';
      this.style.top = '0';
      this.style.removeProperty('bottom');
    } else {
      this.style.height = 'var(--slider-fill, 0%)';
      this.style.width = '100%';
      this.style.bottom = '0';
      this.style.removeProperty('top');
    }
  }
}

export const VolumeSliderIndicatorElement: ConnectedComponentConstructor<any> = toConnectedHTMLComponent(
  VolumeSliderIndicator,
  undefined,
  getVolumeSliderIndicatorProps,
  'VolumeSliderIndicator',
);

// ============================================================================
// THUMB COMPONENT
// ============================================================================

export const getVolumeSliderThumbProps: PropsHook<Record<string, never>> = (_state, element) => {
  const rootElement = element.closest('media-volume-slider') as any;
  return {
    'data-orientation': rootElement?.orientation || 'horizontal',
  };
};

export class VolumeSliderThumb extends HTMLElement {
  constructor() {
    super();
    this.style.position = 'absolute';
  }

  _update(props: any, _state: any): void {
    setAttributes(this, props);

    // Set appropriate positioning based on orientation
    if (props['data-orientation'] === 'horizontal') {
      this.style.left = 'var(--slider-fill, 0%)';
      this.style.top = '50%';
      this.style.translate = '-50% -50%';
    } else {
      this.style.bottom = 'var(--slider-fill, 0%)';
      this.style.left = '50%';
      this.style.translate = '-50% 50%';
    }
  }
}

export const VolumeSliderThumbElement: ConnectedComponentConstructor<any> = toConnectedHTMLComponent(
  VolumeSliderThumb,
  undefined,
  getVolumeSliderThumbProps,
  'VolumeSliderThumb',
);

// ============================================================================
// EXPORTS
// ============================================================================

export const VolumeSliderElement = Object.assign(
  {},
  {
    Root: VolumeSliderRootElement,
    Track: VolumeSliderTrackElement,
    Indicator: VolumeSliderIndicatorElement,
    Thumb: VolumeSliderThumbElement,
  },
) as {
  Root: typeof VolumeSliderRootElement;
  Track: typeof VolumeSliderTrackElement;
  Indicator: typeof VolumeSliderIndicatorElement;
  Thumb: typeof VolumeSliderThumbElement;
};
