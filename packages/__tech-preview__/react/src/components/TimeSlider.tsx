import type { Prettify } from '../types';
import type { ConnectedComponent } from '../utils/component-factory';

import { TimeSlider as CoreTimeSlider } from '@videojs/core-preview';
import { timeSliderStateDefinition } from '@videojs/core-preview/store';
import { shallowEqual } from '@videojs/utils-preview';
import { useMemo } from 'react';
import { useMediaSelector, useMediaStore } from '@/store';
import { toConnectedComponent, toContextComponent, useCore } from '../utils/component-factory';
import { useComposedRefs } from '../utils/use-composed-refs';

export type TimeSliderState = Prettify<ReturnType<typeof useCore<CoreTimeSlider>>> & {
  orientation: 'horizontal' | 'vertical';
};

export interface TimeSliderProps extends React.ComponentPropsWithRef<'div'> {
  orientation?: 'horizontal' | 'vertical';
}

interface TimeSliderRenderProps extends React.ComponentProps<'div'> {
  'data-orientation'?: 'horizontal' | 'vertical';
  'data-current-time'?: number;
  'data-duration'?: number;
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

export function useTimeSliderRootState(props?: TimeSliderProps): TimeSliderState {
  const { orientation = 'horizontal' } = props ?? {};
  const mediaStore = useMediaStore();
  const mediaState = useMediaSelector(timeSliderStateDefinition.stateTransform, shallowEqual);
  const mediaMethods = useMemo(() => timeSliderStateDefinition.createRequestMethods(mediaStore.dispatch), [mediaStore]);
  const coreState = useCore(CoreTimeSlider, { ...mediaState, ...mediaMethods });
  return {
    ...coreState,
    orientation,
  };
}

export function useTimeSliderRootProps(props: TimeSliderProps, state: TimeSliderState): TimeSliderRenderProps {
  const { children, className, id, style, orientation = 'horizontal', ref } = props;
  const composedRef = useComposedRefs(ref, state._setRootElement);

  return {
    ref: composedRef,
    id,
    role: 'slider',
    tabIndex: 0,
    'aria-label': 'Seek',
    'aria-valuemin': 0,
    'aria-valuemax': Math.round(state.duration),
    'aria-valuenow': Math.round(state.currentTime),
    'aria-valuetext': `${state._currentTimeText} of ${state._durationText}`,
    'aria-orientation': orientation,
    'data-orientation': orientation,
    'data-current-time': state.currentTime,
    'data-duration': state.duration,
    className,
    style: {
      ...style,
      '--slider-fill': `${state._fillWidth.toFixed(3)}%`,
      '--slider-pointer': `${(state._pointerWidth * 100).toFixed(3)}%`,
    } as React.CSSProperties,
    children,
  };
}

export function renderTimeSliderRoot(props: TimeSliderRenderProps): JSX.Element {
  return <div {...props} />;
}

const TimeSliderRoot: ConnectedComponent<TimeSliderProps, typeof renderTimeSliderRoot> = toConnectedComponent(
  useTimeSliderRootState,
  useTimeSliderRootProps,
  renderTimeSliderRoot,
  'TimeSlider.Root',
);

// ============================================================================
// TRACK COMPONENT
// ============================================================================

export function useTimeSliderTrackProps(props: React.ComponentProps<'div'>, context: TimeSliderState): TimeSliderRenderProps {
  return {
    ref: context._setTrackElement,
    'data-orientation': context.orientation,
    ...props,
    style: {
      ...props.style,
      [context.orientation === 'horizontal' ? 'width' : 'height']: '100%',
    },
  };
}

export function renderTimeSliderTrack(props: TimeSliderRenderProps): JSX.Element {
  return <div {...props} />;
}

const TimeSliderTrack: ConnectedComponent<React.ComponentProps<'div'>, typeof renderTimeSliderTrack> = toContextComponent(
  useTimeSliderTrackProps,
  renderTimeSliderTrack,
  'TimeSlider.Track',
);

// ============================================================================
// THUMB COMPONENT
// ============================================================================

export function getTimeSliderThumbProps(props: React.ComponentProps<'div'>, context: TimeSliderState): TimeSliderRenderProps {
  return {
    'data-orientation': context.orientation,
    ...props,
    style: {
      ...props.style,
      [context.orientation === 'horizontal' ? 'insetInlineStart' : 'insetBlockEnd']: 'var(--slider-fill)',
      [context.orientation === 'horizontal' ? 'top' : 'left']: '50%',
      translate: context.orientation === 'horizontal' ? '-50% -50%' : '-50% 50%',
      position: 'absolute' as const,
    },
  };
}

export function renderTimeSliderThumb(props: TimeSliderRenderProps): JSX.Element {
  return <div {...props} />;
}

const TimeSliderThumb: ConnectedComponent<React.ComponentProps<'div'>, typeof renderTimeSliderThumb> = toContextComponent(
  getTimeSliderThumbProps,
  renderTimeSliderThumb,
  'TimeSlider.Thumb',
);

// ============================================================================
// POINTER COMPONENT
// ============================================================================

export function getTimeSliderPointerProps(props: React.ComponentProps<'div'>, context: TimeSliderState): TimeSliderRenderProps {
  return {
    'data-orientation': context.orientation,
    ...props,
    style: {
      ...props.style,
      [context.orientation === 'horizontal' ? 'width' : 'height']: 'var(--slider-pointer, 0%)',
      [context.orientation === 'horizontal' ? 'height' : 'width']: '100%',
      position: 'absolute' as const,
    },
  };
}

export function renderTimeSliderPointer(props: TimeSliderRenderProps): JSX.Element {
  return <div {...props} />;
}

const TimeSliderPointer: ConnectedComponent<
  React.ComponentProps<'div'>,
  typeof renderTimeSliderPointer
> = toContextComponent(getTimeSliderPointerProps, renderTimeSliderPointer, 'TimeSlider.Pointer');

// ============================================================================
// PROGRESS COMPONENT
// ============================================================================

export function getTimeSliderProgressProps(props: React.ComponentProps<'div'>, context: TimeSliderState): TimeSliderRenderProps {
  return {
    'data-orientation': context.orientation,
    ...props,
    style: {
      ...props.style,
      [context.orientation === 'horizontal' ? 'width' : 'height']: 'var(--slider-fill, 0%)',
      [context.orientation === 'horizontal' ? 'height' : 'width']: '100%',
      [context.orientation === 'horizontal' ? 'top' : 'bottom']: '0',
      position: 'absolute' as const,
    },
  };
}

export function renderTimeSliderProgress(props: TimeSliderRenderProps): JSX.Element {
  return <div {...props} />;
}

const TimeSliderProgress: ConnectedComponent<
  React.ComponentProps<'div'>,
  typeof renderTimeSliderProgress
> = toContextComponent(getTimeSliderProgressProps, renderTimeSliderProgress, 'TimeSlider.Progress');

// ============================================================================
// EXPORTS
// ============================================================================

export const TimeSlider = Object.assign(
  {},
  {
    Root: TimeSliderRoot,
    Track: TimeSliderTrack,
    Thumb: TimeSliderThumb,
    Pointer: TimeSliderPointer,
    Progress: TimeSliderProgress,
  },
) as {
  Root: typeof TimeSliderRoot;
  Track: typeof TimeSliderTrack;
  Thumb: typeof TimeSliderThumb;
  Pointer: typeof TimeSliderPointer;
  Progress: typeof TimeSliderProgress;
};

export default TimeSlider;
