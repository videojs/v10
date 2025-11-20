import type { MediaStore } from '@videojs/core/store';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook } from '../utils/component-factory';

import { TimeSlider as CoreTimeSlider } from '@videojs/core';
import { timeSliderStateDefinition } from '@videojs/core/store';
import { memoize } from '@videojs/utils';
import { setAttributes } from '@videojs/utils/dom';

import { getCoreState, getPropsFromAttrs, toConnectedHTMLComponent } from '../utils/component-factory';

// ============================================================================
// ROOT COMPONENT
// ============================================================================

type TimeSliderState = Prettify<ReturnType<CoreTimeSlider['getState']>>;

const timeSliderCreateRequestMethods = memoize(timeSliderStateDefinition.createRequestMethods);

export function getTimeSliderRootState(element: HTMLElement, mediaStore: MediaStore): TimeSliderState {
  const mediaState = timeSliderStateDefinition.stateTransform(mediaStore.getState());
  const mediaMethods = timeSliderCreateRequestMethods(mediaStore.dispatch);
  const coreState = getCoreState(CoreTimeSlider, {
    ...getPropsFromAttrs(element),
    ...mediaState,
    ...mediaMethods,
  });
  return {
    ...coreState,
  };
}

/**
 * TimeSlider Root props hook - equivalent to React's useTimeSliderRootProps
 * Handles element attributes and properties based on state
 */
export const getTimeSliderRootProps: PropsHook<TimeSliderState> = (element, state) => {
  if (state._rootElement !== element) {
    state._setRootElement(element);
  }

  return {
    role: 'slider',
    tabindex: element.getAttribute('tabindex') ?? '0',
    'data-current-time': state.currentTime.toString(),
    'data-duration': state.duration.toString(),
    'data-orientation': (element as any).orientation || 'horizontal',
    'aria-label': 'Seek',
    'aria-valuemin': '0',
    'aria-valuemax': Math.round(state.duration).toString(),
    'aria-valuenow': Math.round(state.currentTime).toString(),
    'aria-valuetext': `${state._currentTimeText} of ${state._durationText}`,
    'aria-orientation': (element as any).orientation || 'horizontal',
  };
};

export class TimeSliderRoot extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['commandfor', 'orientation'];

  _state: TimeSliderState | undefined;

  get orientation(): 'horizontal' | 'vertical' {
    return (this.getAttribute('orientation') as 'horizontal' | 'vertical') || 'horizontal';
  }

  attributeChangedCallback(name: string, _oldValue: string | null, newValue: string | null): void {
    if (name === 'commandfor') {
      this.style.setProperty('anchor-name', `--${newValue}`);
    }
  }

  _update(props: any, state: TimeSliderState): void {
    this._state = state;

    this.style.setProperty('--slider-fill', `${state._fillWidth.toFixed(3)}%`);
    this.style.setProperty('--slider-pointer', `${(state._pointerWidth * 100).toFixed(3)}%`);

    setAttributes(this, props);
  }
}

export const TimeSliderRootElement: ConnectedComponentConstructor<TimeSliderState> = toConnectedHTMLComponent(
  TimeSliderRoot,
  getTimeSliderRootState,
  getTimeSliderRootProps,
  'TimeSliderRoot',
);

// ============================================================================
// TRACK COMPONENT
// ============================================================================

export const getTimeSliderTrackProps: PropsHook<Record<string, never>> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as any;

  if (rootElement._state?._trackElement !== element) {
    rootElement._state?._setTrackElement?.(element);
  }

  return {
    'data-orientation': rootElement?.orientation || 'horizontal',
  };
};

export class TimeSliderTrack extends HTMLElement {
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

export const TimeSliderTrackElement: ConnectedComponentConstructor<any> = toConnectedHTMLComponent(
  TimeSliderTrack,
  undefined,
  getTimeSliderTrackProps,
  'TimeSliderTrack',
);

// ============================================================================
// PROGRESS COMPONENT
// ============================================================================

export const getTimeSliderProgressProps: PropsHook<Record<string, never>> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as any;
  return {
    'data-orientation': rootElement?.orientation || 'horizontal',
  };
};

export class TimeSliderProgress extends HTMLElement {
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

export const TimeSliderProgressElement: ConnectedComponentConstructor<any> = toConnectedHTMLComponent(
  TimeSliderProgress,
  undefined,
  getTimeSliderProgressProps,
  'TimeSliderProgress',
);

// ============================================================================
// POINTER COMPONENT
// ============================================================================

export const getTimeSliderPointerProps: PropsHook<Record<string, never>> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as any;
  return {
    'data-orientation': rootElement?.orientation || 'horizontal',
  };
};

export class TimeSliderPointer extends HTMLElement {
  constructor() {
    super();
    this.style.position = 'absolute';
    this.style.width = 'var(--slider-pointer, 0%)';
    this.style.height = '100%';
  }

  _update(props: any, _state: any): void {
    setAttributes(this, props);

    if (props['data-orientation'] === 'horizontal') {
      this.style.width = 'var(--slider-pointer, 0%)';
      this.style.height = '100%';
      this.style.top = '0';
      this.style.removeProperty('bottom');
    } else {
      this.style.height = 'var(--slider-pointer, 0%)';
      this.style.width = '100%';
      this.style.bottom = '0';
      this.style.removeProperty('top');
    }
  }
}

export const TimeSliderPointerElement: ConnectedComponentConstructor<any> = toConnectedHTMLComponent(
  TimeSliderPointer,
  undefined,
  getTimeSliderPointerProps,
  'TimeSliderPointer',
);

// ============================================================================
// THUMB COMPONENT
// ============================================================================

export const getTimeSliderThumbProps: PropsHook<Record<string, never>> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as any;
  return {
    'data-orientation': rootElement?.orientation || 'horizontal',
  };
};

export class TimeSliderThumb extends HTMLElement {
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

export const TimeSliderThumbElement: ConnectedComponentConstructor<any> = toConnectedHTMLComponent(
  TimeSliderThumb,
  undefined,
  getTimeSliderThumbProps,
  'TimeSliderThumb',
);

// ============================================================================
// EXPORTS
// ============================================================================

export const TimeSliderElement = Object.assign(
  {},
  {
    Root: TimeSliderRootElement,
    Track: TimeSliderTrackElement,
    Progress: TimeSliderProgressElement,
    Pointer: TimeSliderPointerElement,
    Thumb: TimeSliderThumbElement,
  },
) as {
  Root: typeof TimeSliderRootElement;
  Track: typeof TimeSliderTrackElement;
  Progress: typeof TimeSliderProgressElement;
  Pointer: typeof TimeSliderPointerElement;
  Thumb: typeof TimeSliderThumbElement;
};
