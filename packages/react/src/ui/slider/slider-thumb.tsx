import type { ForwardedRef } from 'react';
import { forwardRef, useCallback, useSyncExternalStore } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import type { SliderRenderState } from '../hooks/use-slider';
import { useSliderContext } from './context';

export interface SliderThumbProps extends UIComponentProps<'div', SliderRenderState> {}

/** Draggable handle for setting the slider value. Receives focus and handles keyboard interaction. */
export const SliderThumb = forwardRef(function SliderThumb(
  componentProps: SliderThumbProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, ...elementProps } = componentProps;

  const context = useSliderContext();
  const { state, thumbRef, thumbProps, getAttrs } = context;
  const subscribeToPointer = useCallback(
    (onChange: () => void) => (state.dragging ? context.motion.subscribe(onChange) : () => {}),
    [context.motion, state.dragging]
  );
  const pointerPercent = useSyncExternalStore(
    subscribeToPointer,
    () => context.motion.current.pointerPercent,
    () => context.motion.current.pointerPercent
  );
  const attrs = getAttrs(state, {
    pointerPercent,
    pointerValue: context.getPointerValue(pointerPercent),
  });

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: context.stateAttrMap,
      ref: [forwardedRef, thumbRef],
      props: [attrs, thumbProps, elementProps],
    }
  );
});

export namespace SliderThumb {
  export type Props = SliderThumbProps;
}
