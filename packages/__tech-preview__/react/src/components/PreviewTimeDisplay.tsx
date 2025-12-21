import type { PropsWithChildren } from 'react';
import type { ConnectedComponent } from '../utils/component-factory';

import { previewTimeDisplayStateDefinition } from '@videojs/core/store';
import { formatDisplayTime, shallowEqual } from '@videojs/utils';

import { useMediaSelector } from '@/store';
import { toConnectedComponent } from '../utils/component-factory';

export function usePreviewTimeDisplayState(_props: any): {
  previewTime: number;
} {
  /** @TODO Fix type issues with hooks (CJP) */
  const mediaState = useMediaSelector(previewTimeDisplayStateDefinition.stateTransform, shallowEqual);

  // Preview time display is read-only, no request methods needed
  return {
    previewTime: mediaState.previewTime ?? 0,
  };
}

export type PreviewTimeDisplayState = ReturnType<typeof usePreviewTimeDisplayState>;

export interface PreviewTimeDisplayProps extends React.ComponentProps<'span'> {
  showRemaining?: boolean;
}

export function getPreviewTimeDisplayProps(
  props: PropsWithChildren,
  _state: ReturnType<typeof usePreviewTimeDisplayState>,
): PropsWithChildren<Record<string, unknown>> {
  const baseProps: Record<string, any> = {
    /** external props spread last to allow for overriding */
    ...props,
  };

  return baseProps;
}

export function renderPreviewTimeDisplay(props: PreviewTimeDisplayProps, state: PreviewTimeDisplayState): JSX.Element {
  const { showRemaining, ...restProps } = props;

  /** @TODO Should this live here or elsewhere? (CJP) */
  const timeLabel = formatDisplayTime(state.previewTime);

  return <span {...restProps}>{timeLabel}</span>;
}

export const PreviewTimeDisplay: ConnectedComponent<PreviewTimeDisplayProps, typeof renderPreviewTimeDisplay>
  = toConnectedComponent(
    usePreviewTimeDisplayState,
    getPreviewTimeDisplayProps,
    renderPreviewTimeDisplay,
    'PreviewTimeDisplay',
  );

export default PreviewTimeDisplay;
