import type { UIComponentProps } from '../../utils/types';
import { createContextPart } from '../create-context-part';
import type { SliderRenderState } from '../hooks/use-slider';
import { useSliderContext } from './context';

export interface SliderFillProps extends UIComponentProps<'div', SliderRenderState> {}

/** Displays the filled portion from start to the current value. */
export const SliderFill = createContextPart<SliderFillProps, SliderRenderState>({
  displayName: 'SliderFill',
  tag: 'div',
  useContext: useSliderContext,
});

export namespace SliderFill {
  export type Props = SliderFillProps;
}
