import type { UIComponentProps } from '../../utils/types';
import { createContextPart } from '../create-context-part';
import type { SliderRenderState } from '../hooks/use-slider';
import { useSliderContext } from './context';

export interface SliderBufferProps extends UIComponentProps<'div', SliderRenderState> {}

/** Displays the buffered range on the slider track. */
export const SliderBuffer = createContextPart<SliderBufferProps, SliderRenderState>({
  displayName: 'SliderBuffer',
  tag: 'div',
  useContext: useSliderContext,
});

export namespace SliderBuffer {
  export type Props = SliderBufferProps;
}
