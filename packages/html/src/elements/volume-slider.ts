import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { VolumeSlider as CoreVolumeSlider } from '@videojs/core';
import { volumeSliderStateDefinition } from '@videojs/core/store';
import { memoize } from '@videojs/utils';
import { setAttributes } from '@videojs/utils/dom';

import { getCoreState, getPropsFromAttrs, toConnectedHTMLComponent } from '../utils/component-factory';

// ============================================================================
// ROOT COMPONENT
// ============================================================================

type VolumeSliderState = Prettify<ReturnType<CoreVolumeSlider['getState']>>;
type VolumeSliderStateWithMethods = Prettify<VolumeSliderState & ReturnType<typeof volumeSliderStateDefinition.createRequestMethods>>;

const volumeSliderCreateRequestMethods = memoize(volumeSliderStateDefinition.createRequestMethods);

export const getVolumeSliderRootState: StateHook<VolumeSliderRoot, VolumeSliderStateWithMethods> = (element, mediaStore) => {
  const mediaState = volumeSliderStateDefinition.stateTransform(mediaStore.getState());
  const mediaMethods = volumeSliderCreateRequestMethods(mediaStore.dispatch);
  const coreState = getCoreState(CoreVolumeSlider, {
    ...getPropsFromAttrs(element),
    ...mediaState,
    ...mediaMethods,
  });
  return {
    ...coreState,
  };
};

/**
 * VolumeSlider Root props hook - equivalent to React's useVolumeSliderRootProps
 * Handles element attributes and properties based on state
 */
export const getVolumeSliderRootProps: PropsHook<VolumeSliderRoot, VolumeSliderStateWithMethods> = (element, state) => {
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
    style: {
      ...(element.hasAttribute('commandfor') ? { 'anchor-name': `--${element.getAttribute('commandfor')}` } : {}),
      '--slider-fill': `${state._fillWidth.toFixed(3)}%`,
    },
  };
};

export class VolumeSliderRoot extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['commandfor', 'orientation'];

  _state: VolumeSliderState | undefined;

  get orientation(): 'horizontal' | 'vertical' {
    return (this.getAttribute('orientation') as 'horizontal' | 'vertical') || 'horizontal';
  }

  _update(props: any, state: VolumeSliderState): void {
    this._state = state;
    setAttributes(this, props);
  }
}

export const VolumeSliderRootElement: ConnectedComponentConstructor<VolumeSliderRoot, VolumeSliderStateWithMethods> = toConnectedHTMLComponent(
  VolumeSliderRoot,
  getVolumeSliderRootState,
  getVolumeSliderRootProps,
  'VolumeSliderRoot',
);

// ============================================================================
// TRACK COMPONENT
// ============================================================================

export const getVolumeSliderTrackProps: PropsHook<VolumeSliderTrack, undefined> = (element, _state) => {
  const rootElement = element.closest('media-volume-slider') as any;

  if (rootElement._state?._trackElement !== element) {
    rootElement._state?._setTrackElement?.(element);
  }

  const orientation = rootElement?.orientation || 'horizontal';

  return {
    'data-orientation': orientation,
    style: {
      width: orientation === 'horizontal' ? '100%' : undefined,
      height: orientation !== 'horizontal' ? '100%' : undefined,
    },
  };
};

export class VolumeSliderTrack extends HTMLElement {
  _update(props: any, _state: any): void {
    setAttributes(this, props);
  }
}

export const VolumeSliderTrackElement: ConnectedComponentConstructor<VolumeSliderTrack, undefined> = toConnectedHTMLComponent(
  VolumeSliderTrack,
  undefined,
  getVolumeSliderTrackProps,
  'VolumeSliderTrack',
);

// ============================================================================
// INDICATOR COMPONENT
// ============================================================================

export const getVolumeSliderIndicatorProps: PropsHook<VolumeSliderIndicator, undefined> = (element, _state) => {
  const rootElement = element.closest('media-volume-slider') as any;
  const orientation = rootElement?.orientation || 'horizontal';
  const style = orientation === 'horizontal'
    ? {
        position: 'absolute',
        width: 'var(--slider-fill, 0%)',
        height: '100%',
        top: '0',
        bottom: undefined,
      }
    : {
        position: 'absolute',
        height: 'var(--slider-fill, 0%)',
        width: '100%',
        bottom: '0',
        top: undefined,
      };

  return {
    'data-orientation': orientation,
    style,
  };
};

export class VolumeSliderIndicator extends HTMLElement {
  _update(props: any, _state: any): void {
    setAttributes(this, props);
  }
}

export const VolumeSliderIndicatorElement: ConnectedComponentConstructor<VolumeSliderIndicator, undefined> = toConnectedHTMLComponent(
  VolumeSliderIndicator,
  undefined,
  getVolumeSliderIndicatorProps,
  'VolumeSliderIndicator',
);

// ============================================================================
// THUMB COMPONENT
// ============================================================================

export const getVolumeSliderThumbProps: PropsHook<VolumeSliderThumb, undefined> = (element, _state) => {
  const rootElement = element.closest('media-volume-slider') as any;
  const orientation = rootElement?.orientation || 'horizontal';
  const style = orientation === 'horizontal'
    ? {
        position: 'absolute',
        left: 'var(--slider-fill, 0%)',
        top: '50%',
        bottom: undefined,
        translate: '-50% -50%',
      }
    : {
        position: 'absolute',
        bottom: 'var(--slider-fill, 0%)',
        left: '50%',
        top: undefined,
        translate: '-50% 50%',
      };

  return {
    'data-orientation': orientation,
    style,
  };
};

export class VolumeSliderThumb extends HTMLElement {
  _update(props: any, _state: any): void {
    setAttributes(this, props);
  }
}

export const VolumeSliderThumbElement: ConnectedComponentConstructor<VolumeSliderThumb, undefined> = toConnectedHTMLComponent(
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
