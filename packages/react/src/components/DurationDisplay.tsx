import { usePlayer } from '@videojs/store/react';
import { formatDisplayTime } from '@videojs/utils';
import type { PropsWithChildren } from 'react';
import type { ConnectedComponent } from '../utils/component-factory';
import { toConnectedComponent } from '../utils/component-factory';

export function useDurationDisplayState(_props: any) {
  const duration = usePlayer((state) => state.duration);

  return {
    duration,
  };
}

export type UseDurationDisplayState = typeof useDurationDisplayState;
export type DurationDisplayState = ReturnType<UseDurationDisplayState>;

export function useDurationDisplayProps(props: PropsWithChildren): PropsWithChildren<Record<string, unknown>> {
  const baseProps: Record<string, any> = {
    /** external props spread last to allow for overriding */
    ...props,
  };

  return baseProps;
}

export type UseDurationDisplayProps = typeof useDurationDisplayProps;
type DurationDisplayProps = ReturnType<UseDurationDisplayProps>;

export function renderDurationDisplay(props: DurationDisplayProps, state: DurationDisplayState): React.JSX.Element {
  return <span {...props}>{formatDisplayTime(state.duration)}</span>;
}

export type RenderDurationDisplay = typeof renderDurationDisplay;

export const DurationDisplay: ConnectedComponent<DurationDisplayProps, RenderDurationDisplay> = toConnectedComponent(
  useDurationDisplayState,
  useDurationDisplayProps,
  renderDurationDisplay,
  'DurationDisplay'
);

export default DurationDisplay;
