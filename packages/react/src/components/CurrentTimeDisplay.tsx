import { useMediaSelector } from '@videojs/store/react';
import { formatDisplayTime } from '@videojs/utils';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent } from '../utils/component-factory';

export interface CurrentTimeDisplayProps extends React.ComponentPropsWithoutRef<'span'> {
  showRemaining?: boolean;
}

export function useCurrentTimeDisplayState(_props?: CurrentTimeDisplayProps) {
  const currentTime = useMediaSelector((state) => state.currentTime);
  const duration = useMediaSelector((state) => state.duration);

  return {
    currentTime,
    duration,
  };
}

export type CurrentTimeDisplayState = ReturnType<typeof useCurrentTimeDisplayState>;

export function useCurrentTimeDisplayProps(
  props: CurrentTimeDisplayProps,
  _state: ReturnType<typeof useCurrentTimeDisplayState>
): CurrentTimeDisplayProps {
  const baseProps: CurrentTimeDisplayProps = {
    /** external props spread last to allow for overriding */
    ...props,
  };

  return baseProps;
}

export function renderCurrentTimeDisplay(
  props: CurrentTimeDisplayProps,
  state: CurrentTimeDisplayState
): React.JSX.Element {
  const { showRemaining, ...restProps } = props;

  /** @TODO Should this live here or elsewhere? (CJP) */
  const timeLabel =
    showRemaining && state.duration != null && state.currentTime != null
      ? formatDisplayTime(-(state.duration - state.currentTime))
      : formatDisplayTime(state.currentTime);

  return <span {...restProps}>{timeLabel}</span>;
}

export const CurrentTimeDisplay: ConnectedComponent<CurrentTimeDisplayProps, typeof renderCurrentTimeDisplay> =
  toConnectedComponent(
    useCurrentTimeDisplayState,
    useCurrentTimeDisplayProps,
    renderCurrentTimeDisplay,
    'CurrentTimeDisplay'
  );

export default CurrentTimeDisplay;
