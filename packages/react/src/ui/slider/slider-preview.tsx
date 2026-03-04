'use client';

import type { SliderState } from '@videojs/core';
import type { CSSProperties, ForwardedRef } from 'react';
import { forwardRef, useEffect, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useSliderContext } from './context';

export interface SliderPreviewProps extends UIComponentProps<'div', SliderState> {
  /** Disable boundary clamping so the preview can extend beyond the slider edges. */
  noClamp?: boolean | undefined;
}

/** Positioning container for preview content that tracks the pointer along the slider. */
export const SliderPreview = forwardRef(function SliderPreview(
  componentProps: SliderPreviewProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, noClamp, ...elementProps } = componentProps;

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

  const halfWidth = width / 2;

  const positionStyle: CSSProperties = {
    position: 'absolute',
    left: noClamp
      ? `calc(var(--media-slider-pointer) - ${halfWidth}px)`
      : `min(max(0px, calc(var(--media-slider-pointer) - ${halfWidth}px)), calc(100% - ${width}px))`,
    width: 'max-content',
    pointerEvents: 'none',
  };

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
