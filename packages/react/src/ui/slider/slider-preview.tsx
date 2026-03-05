'use client';

import type { SliderState } from '@videojs/core';
import type { SliderPreviewOverflow } from '@videojs/core/dom';
import { getSliderPreviewStyle } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './context';

export interface SliderPreviewProps extends UIComponentProps<'div', SliderState> {
  /** How the preview handles the slider boundaries. `'clamp'` keeps the preview within bounds, `'visible'` allows it to extend beyond the edges. */
  overflow?: SliderPreviewOverflow | undefined;
}

/** Positioning container for preview content that tracks the pointer along the slider. */
export const SliderPreview = forwardRef(function SliderPreview(
  componentProps: SliderPreviewProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, overflow = 'clamp', ...elementProps } = componentProps;

  const context = useSliderContext();
  const { state } = context;

  const measureRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(entry!.contentRect.width);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const positionStyle = getSliderPreviewStyle(width, overflow);

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap: context.stateAttrMap,
      ref: [forwardedRef, measureRef],
      props: [{ style: positionStyle }, elementProps],
    }
  );
});

export namespace SliderPreview {
  export type Props = SliderPreviewProps;
}
