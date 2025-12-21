import type { PropsWithChildren } from 'react';
import type { ConnectedComponent } from '../utils/component-factory';

import { currentTimeDisplayStateDefinition } from '@videojs/core/store';
import { formatDisplayTime, shallowEqual } from '@videojs/utils';

import { useMediaSelector } from '@/store';
import { toConnectedComponent } from '../utils/component-factory';

export function useCurrentTimeDisplayState(_props?: any): {
  currentTime: number;
  duration: number;
} {
  /** @TODO Fix type issues with hooks (CJP) */
  const mediaState = useMediaSelector(currentTimeDisplayStateDefinition.stateTransform, shallowEqual);

  // Current time display is read-only, no request methods needed
  return {
    currentTime: mediaState.currentTime ?? 0,
    duration: mediaState.duration ?? 0,
  };
}

export type CurrentTimeDisplayState = ReturnType<typeof useCurrentTimeDisplayState>;

export interface CurrentTimeDisplayProps extends React.ComponentProps<'span'> {
  showRemaining?: boolean;
}

export function useCurrentTimeDisplayProps(
  props: PropsWithChildren,
  _state: ReturnType<typeof useCurrentTimeDisplayState>,
): PropsWithChildren<Record<string, unknown>> {
  const baseProps: Record<string, any> = {
    /** external props spread last to allow for overriding */
    ...props,
  };

  return baseProps;
}

export function renderCurrentTimeDisplay(props: CurrentTimeDisplayProps, state: CurrentTimeDisplayState): JSX.Element {
  const { showRemaining, ...restProps } = props;

  /** @TODO Should this live here or elsewhere? (CJP) */
  const timeLabel
    = showRemaining && state.duration != null && state.currentTime != null
      ? formatDisplayTime(-(state.duration - state.currentTime))
      : formatDisplayTime(state.currentTime);

  return <span {...restProps}>{timeLabel}</span>;
}

export const CurrentTimeDisplay: ConnectedComponent<CurrentTimeDisplayProps, typeof renderCurrentTimeDisplay>
  = toConnectedComponent(
    useCurrentTimeDisplayState,
    useCurrentTimeDisplayProps,
    renderCurrentTimeDisplay,
    'CurrentTimeDisplay',
  );

export default CurrentTimeDisplay;
