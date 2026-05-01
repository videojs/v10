'use client';

import type { MenuState } from '@videojs/core';
import { getAnchorPositionStyle, getPopupPositionRect, resolveOffsets } from '@videojs/core/dom';
import { supportsAnchorPositioning } from '@videojs/utils/dom';
import type { CSSProperties } from 'react';
import { forwardRef, useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useComposedRefs } from '../../utils/use-composed-refs';
import { renderElement } from '../../utils/use-render';
import { useMenuContext } from './context';

export interface MenuContentProps extends UIComponentProps<'div', MenuState> {}

const POPOVER_RESET: CSSProperties = { position: 'fixed', inset: 'auto', margin: 0 };

/** Container for menu items. Positioned relative to the trigger using CSS anchor positioning with a JavaScript fallback. */
export const MenuContent = forwardRef<HTMLDivElement, MenuContentProps>(function MenuContent(
  { render, className, style, ...elementProps },
  forwardedRef
) {
  const { core, menu, state, stateAttrMap, anchorName, contentId } = useMenuContext();
  const internalRef = useRef<HTMLDivElement>(null);

  const contentRef = useCallback(
    (element: HTMLDivElement | null) => {
      menu.setContentElement(element);
      if (element && supportsAnchorPositioning()) {
        element.style.setProperty('position-anchor', `--${anchorName}`);
      }
    },
    [menu, anchorName]
  );

  const composedRef = useComposedRefs(forwardedRef, contentRef, internalRef);

  // --- Positioning ---

  const positionOptions = useMemo(() => ({ side: state.side, align: state.align }), [state.side, state.align]);

  const anchorStyle = useMemo(() => {
    if (!supportsAnchorPositioning()) return null;
    const { positionAnchor: _, ...rest } = getAnchorPositionStyle(anchorName, positionOptions);
    return rest as CSSProperties;
  }, [anchorName, positionOptions]);

  const [manualStyle, setManualStyle] = useState<CSSProperties | null>(null);

  useLayoutEffect(() => {
    if (supportsAnchorPositioning()) return;
    if (!state.open) {
      setManualStyle(null);
      return;
    }

    function measure(): void {
      const triggerElement = menu.triggerElement;
      const contentElement = internalRef.current;
      if (!triggerElement || !contentElement) return;

      const triggerRect = triggerElement.getBoundingClientRect();
      const contentRect = getPopupPositionRect(contentElement);
      const boundaryRect = document.documentElement.getBoundingClientRect();
      const offsets = resolveOffsets(contentElement);

      setManualStyle(
        getAnchorPositionStyle(
          anchorName,
          positionOptions,
          triggerRect,
          contentRect,
          boundaryRect,
          offsets
        ) as CSSProperties
      );
    }

    measure();

    const triggerElement = menu.triggerElement;
    const contentElement = internalRef.current;

    let animationFrameId = 0;
    function reposition(): void {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(measure);
    }

    reposition();

    const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(() => reposition()) : null;

    if (triggerElement && resizeObserver) resizeObserver.observe(triggerElement);
    if (contentElement && resizeObserver) resizeObserver.observe(contentElement);

    window.addEventListener('scroll', reposition, { capture: true, passive: true });
    window.addEventListener('resize', reposition);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver?.disconnect();
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [state.open, anchorName, positionOptions, menu]);

  const positioningStyle = anchorStyle ?? manualStyle ?? POPOVER_RESET;

  if (!state.open) return null;

  // Remap DOM keyboard event to React synthetic name.
  const { onKeyDown } = menu.contentProps;

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      stateAttrMap,
      ref: composedRef,
      props: [
        {
          id: contentId,
          style: positioningStyle,
          ...core.getContentAttrs(state),
        },
        { onKeyDown },
        elementProps,
      ],
    }
  );
});

export namespace MenuContent {
  export type Props = MenuContentProps;
  export type State = MenuState;
}
