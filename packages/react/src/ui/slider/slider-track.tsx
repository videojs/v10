import type { UIComponentProps } from '../../utils/types';
import { createContextPart } from '../create-context-part';
import type { SliderRenderState } from '../hooks/use-slider';
import { useSliderContext } from './context';

export interface SliderTrackProps extends UIComponentProps<'div', SliderRenderState> {}

/** Contains the slider's visual track and interactive hit zone. */
export const SliderTrack = createContextPart<SliderTrackProps, SliderRenderState>({
  displayName: 'SliderTrack',
  tag: 'div',
  useContext: useSliderContext,
});

export namespace SliderTrack {
  export type Props = SliderTrackProps;
}
