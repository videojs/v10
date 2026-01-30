import { VolumeSlider as CoreVolumeSlider } from '@videojs/core';
import { useMediaSelector } from '@videojs/store/react';
import type { Prettify } from '../types';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent, toContextComponent, useCore } from '../utils/component-factory';
import { useComposedRefs } from '../utils/use-composed-refs';

export type VolumeSliderState = Prettify<ReturnType<typeof useCore<CoreVolumeSlider>>> & {
  orientation: 'horizontal' | 'vertical';
};

export interface VolumeSliderProps extends React.ComponentPropsWithRef<'div'> {
  orientation?: 'horizontal' | 'vertical';
}

interface VolumeSliderRenderProps extends React.ComponentProps<'div'> {
  'data-orientation'?: 'horizontal' | 'vertical';
  'data-muted'?: boolean;
  'data-volume-level'?: string;
  'data-volume'?: number;
}

// ============================================================================
// ROOT COMPONENT
// ============================================================================

export function useVolumeSliderRootState(props?: VolumeSliderProps): VolumeSliderState {
  const { orientation = 'horizontal' } = props ?? {};
  const volume = useMediaSelector((state) => state.volume);
  const muted = useMediaSelector((state) => state.muted);
  const volumeLevel = useMediaSelector((state) => state.volumeLevel);
  const setVolume = useMediaSelector((state) => state.setVolume);
  const coreState = useCore(CoreVolumeSlider, {
    volume,
    muted,
    volumeLevel,
    setVolume,
  });
  return {
    ...coreState,
    orientation,
  };
}

export function useVolumeSliderRootProps(props: VolumeSliderProps, state: VolumeSliderState): VolumeSliderRenderProps {
  const { children, className, id, style, orientation = 'horizontal', ref } = props;
  const composedRef = useComposedRefs(ref, state._setRootElement);

  return {
    ref: composedRef,
    id,
    role: 'slider',
    tabIndex: 0,
    'aria-label': 'Volume',
    'aria-valuemin': 0,
    'aria-valuemax': 100,
    'aria-valuenow': Math.round(state.volume * 100),
    'aria-valuetext': state._volumeText,
    'aria-orientation': orientation,
    'data-orientation': orientation,
    'data-muted': state.muted,
    'data-volume-level': state.volumeLevel,
    'data-volume': state.volume,
    className,
    style: {
      ...style,
      '--slider-fill': `${state._fillWidth.toFixed(3)}%`,
      '--slider-pointer': `${(state._pointerWidth * 100).toFixed(3)}%`,
    } as React.CSSProperties,
    children,
  };
}

export function renderVolumeSliderRoot(props: VolumeSliderRenderProps): React.JSX.Element {
  return <div {...props} />;
}

const VolumeSliderRoot: ConnectedComponent<VolumeSliderProps, typeof renderVolumeSliderRoot> = toConnectedComponent(
  useVolumeSliderRootState,
  useVolumeSliderRootProps,
  renderVolumeSliderRoot,
  'VolumeSlider.Root'
);

// ============================================================================
// TRACK COMPONENT
// ============================================================================

export function useVolumeSliderTrackProps(
  props: React.ComponentProps<'div'>,
  context: VolumeSliderState
): VolumeSliderRenderProps {
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

export function renderVolumeSliderTrack(props: VolumeSliderRenderProps): React.JSX.Element {
  return <div {...props} />;
}

const VolumeSliderTrack: ConnectedComponent<
  React.ComponentProps<'div'>,
  typeof renderVolumeSliderTrack
> = toContextComponent(useVolumeSliderTrackProps, renderVolumeSliderTrack, 'VolumeSlider.Track');

// ============================================================================
// THUMB COMPONENT
// ============================================================================

export function getVolumeSliderThumbProps(
  props: React.ComponentProps<'div'>,
  context: VolumeSliderState
): VolumeSliderRenderProps {
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

export function renderVolumeSliderThumb(props: VolumeSliderRenderProps): React.JSX.Element {
  return <div {...props} />;
}

const VolumeSliderThumb: ConnectedComponent<
  React.ComponentProps<'div'>,
  typeof renderVolumeSliderThumb
> = toContextComponent(getVolumeSliderThumbProps, renderVolumeSliderThumb, 'VolumeSlider.Thumb');

// ============================================================================
// PROGRESS COMPONENT
// ============================================================================

export function getVolumeSliderProgressProps(
  props: React.ComponentProps<'div'>,
  context: VolumeSliderState
): VolumeSliderRenderProps {
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

export function renderVolumeSliderProgress(props: VolumeSliderRenderProps): React.JSX.Element {
  return <div {...props} />;
}

const VolumeSliderProgress: ConnectedComponent<
  React.ComponentProps<'div'>,
  typeof renderVolumeSliderProgress
> = toContextComponent(getVolumeSliderProgressProps, renderVolumeSliderProgress, 'VolumeSlider.Progress');

// ============================================================================
// EXPORTS
// ============================================================================

export const VolumeSlider = Object.assign(
  {},
  {
    Root: VolumeSliderRoot,
    Track: VolumeSliderTrack,
    Thumb: VolumeSliderThumb,
    Progress: VolumeSliderProgress,
  }
) as {
  Root: typeof VolumeSliderRoot;
  Track: typeof VolumeSliderTrack;
  Thumb: typeof VolumeSliderThumb;
  Progress: typeof VolumeSliderProgress;
};

export default VolumeSlider;
