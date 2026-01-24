import { TimeSlider as CoreTimeSlider } from '@videojs/core';
import { timeSliderStateDefinition } from '@videojs/store';
import { memoize } from '@videojs/utils';
import type { Prettify } from '../types';
import type { ConnectedComponentConstructor, PropsHook, StateHook } from '../utils/component-factory';

import { getCoreState, getPropsFromAttrs, toConnectedHTMLComponent } from '../utils/component-factory';

// ============================================================================
// ROOT COMPONENT
// ============================================================================

type TimeSliderState = Prettify<ReturnType<CoreTimeSlider['getState']>>;
type TimeSliderStateWithMethods = Prettify<
  TimeSliderState & ReturnType<typeof timeSliderStateDefinition.createRequestMethods>
>;

const timeSliderCreateRequestMethods = memoize(timeSliderStateDefinition.createRequestMethods);

export const getTimeSliderRootState: StateHook<TimeSliderRoot, TimeSliderStateWithMethods> = (element, mediaStore) => {
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
};

/**
 * TimeSlider Root props hook - equivalent to React's useTimeSliderRootProps
 * Handles element attributes and properties based on state
 */
export const getTimeSliderRootProps: PropsHook<TimeSliderRoot, TimeSliderStateWithMethods> = (element, state) => {
  if (state._rootElement !== element) {
    state._setRootElement(element);
  }

  return {
    role: 'slider',
    tabindex: element.getAttribute('tabindex') ?? '0',
    'data-current-time': state.currentTime.toString(),
    'data-duration': state.duration.toString(),
    'data-orientation': element.orientation || 'horizontal',
    'aria-label': 'Seek',
    'aria-valuemin': '0',
    'aria-valuemax': Math.round(state.duration).toString(),
    'aria-valuenow': Math.round(state.currentTime).toString(),
    'aria-valuetext': `${state._currentTimeText} of ${state._durationText}`,
    'aria-orientation': element.orientation || 'horizontal',
    style: {
      ...(element.hasAttribute('commandfor') ? { anchorName: `--${element.getAttribute('commandfor')}` } : {}),
      '--slider-fill': `${state._fillWidth.toFixed(3)}%`,
      '--slider-pointer': `${(state._pointerWidth * 100).toFixed(3)}%`,
    },
  };
};

export class TimeSliderRoot extends HTMLElement {
  static readonly observedAttributes: readonly string[] = ['commandfor', 'orientation'];

  _state: TimeSliderState | undefined;

  get orientation(): 'horizontal' | 'vertical' {
    return (this.getAttribute('orientation') as 'horizontal' | 'vertical') || 'horizontal';
  }
}

export const TimeSliderRootElement: ConnectedComponentConstructor<TimeSliderRoot, TimeSliderStateWithMethods> =
  toConnectedHTMLComponent(TimeSliderRoot, getTimeSliderRootState, getTimeSliderRootProps, 'TimeSliderRoot');

// ============================================================================
// TRACK COMPONENT
// ============================================================================

export const getTimeSliderTrackProps: PropsHook<TimeSliderTrack, undefined> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as TimeSliderRoot;

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

export class TimeSliderTrack extends HTMLElement {}

export const TimeSliderTrackElement: ConnectedComponentConstructor<TimeSliderTrack, undefined> =
  toConnectedHTMLComponent(TimeSliderTrack, undefined, getTimeSliderTrackProps, 'TimeSliderTrack');

// ============================================================================
// PROGRESS COMPONENT
// ============================================================================

export const getTimeSliderProgressProps: PropsHook<TimeSliderProgress, undefined> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as TimeSliderRoot;
  const orientation = rootElement?.orientation || 'horizontal';
  const style =
    orientation === 'horizontal'
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

export class TimeSliderProgress extends HTMLElement {}

export const TimeSliderProgressElement: ConnectedComponentConstructor<TimeSliderProgress, undefined> =
  toConnectedHTMLComponent(TimeSliderProgress, undefined, getTimeSliderProgressProps, 'TimeSliderProgress');

// ============================================================================
// POINTER COMPONENT
// ============================================================================

export const getTimeSliderPointerProps: PropsHook<TimeSliderPointer, undefined> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as TimeSliderRoot;
  const orientation = rootElement?.orientation || 'horizontal';
  const style =
    orientation === 'horizontal'
      ? {
          position: 'absolute',
          width: 'var(--slider-pointer, 0%)',
          height: '100%',
          top: '0',
          bottom: undefined,
        }
      : {
          position: 'absolute',
          height: 'var(--slider-pointer, 0%)',
          width: '100%',
          bottom: '0',
          top: undefined,
        };

  return {
    'data-orientation': orientation,
    style,
  };
};

export class TimeSliderPointer extends HTMLElement {}

export const TimeSliderPointerElement: ConnectedComponentConstructor<TimeSliderPointer, undefined> =
  toConnectedHTMLComponent(TimeSliderPointer, undefined, getTimeSliderPointerProps, 'TimeSliderPointer');

// ============================================================================
// THUMB COMPONENT
// ============================================================================

export const getTimeSliderThumbProps: PropsHook<TimeSliderThumb, undefined> = (element, _state) => {
  const rootElement = element.closest('media-time-slider') as TimeSliderRoot;
  const orientation = rootElement?.orientation || 'horizontal';
  const style =
    orientation === 'horizontal'
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

export class TimeSliderThumb extends HTMLElement {}

export const TimeSliderThumbElement: ConnectedComponentConstructor<TimeSliderThumb, undefined> =
  toConnectedHTMLComponent(TimeSliderThumb, undefined, getTimeSliderThumbProps, 'TimeSliderThumb');

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
  }
) as {
  Root: typeof TimeSliderRootElement;
  Track: typeof TimeSliderTrackElement;
  Progress: typeof TimeSliderProgressElement;
  Pointer: typeof TimeSliderPointerElement;
  Thumb: typeof TimeSliderThumbElement;
};
