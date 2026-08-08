'use client';

import {
  getMenuTransitionPanelAttrs,
  MenuCSSVars,
  MenuTransitionDataAttrs,
  type MenuTransitionPanelState,
  MenuTransitionStateDataAttrs,
} from '@videojs/core';
import {
  createMenuTransition,
  getStateDataAttrs,
  type MenuTransitionApi,
  type MenuTransitionSize,
} from '@videojs/core/dom';
import { useSnapshot } from '@videojs/store/react';
import {
  type CSSProperties,
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { composeRefs } from '../../utils/use-composed-refs';
import { useMenuContext } from './context';
import type { MenuContentProps } from './menu-content';
import { MenuTransitionRootContextProvider } from './menu-transition-context';
import { measureMenuTransitionPanel } from './menu-transition-measure';

export interface MenuTransitionRootProps {
  /** The outer Menu.Content to bind as the transition container. */
  render: ReactElement<MenuContentProps>;
  /** Class applied to the generated root panel. */
  className?: string;
  /** Inline style applied to the generated root panel. */
  style?: CSSProperties;
  children?: ReactNode;
}

function getSizedContentStyle(style: MenuContentProps['style'], size: MenuTransitionSize): MenuContentProps['style'] {
  return (state) => {
    const resolvedStyle = typeof style === 'function' ? style(state) : style;
    return {
      ...resolvedStyle,
      ...(size.width === null ? {} : { [MenuCSSVars.width]: `${size.width}px` }),
      ...(size.height === null ? {} : { [MenuCSSVars.height]: `${size.height}px` }),
    };
  };
}

interface RootPanelProps {
  controller: MenuTransitionApi;
  container: HTMLElement | null;
  className?: string | undefined;
  style?: CSSProperties | undefined;
  children?: ReactNode | undefined;
}

function RootPanel({ controller, container, className, style, children }: RootPanelProps): ReactNode {
  const state = useSnapshot(controller.rootState);
  const panelRef = useRef<HTMLDivElement>(null);

  const measure = useCallback(() => {
    const panel = panelRef.current;
    if (container && panel) controller.setSize(measureMenuTransitionPanel(container, panel));
  }, [container, controller]);

  useLayoutEffect(() => {
    if (state.interactive) measure();
  }, [measure, state.interactive]);

  useEffect(() => {
    if (!state.interactive) return;
    measure();
    const frame = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(frame);
  }, [measure, state.interactive]);

  useEffect(() => {
    const panel = panelRef.current;
    if (!state.interactive || !panel || typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(measure);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [measure, state.interactive]);

  const setPanelElement = useCallback(
    (element: HTMLDivElement | null) => {
      panelRef.current = element;
      controller.setRootPanelElement(element);
    },
    [controller]
  );

  return (
    <div
      ref={setPanelElement}
      className={className}
      style={style}
      {...getStateDataAttrs(state, MenuTransitionStateDataAttrs)}
      {...getMenuTransitionPanelAttrs(state)}
      {...{
        [MenuTransitionDataAttrs.rootView]: '',
        [MenuTransitionDataAttrs.view]: '',
      }}
    >
      {children}
    </div>
  );
}

/** Binds an outer Menu.Content to its root panel and registered child views. */
export function MenuTransitionRoot({ render, className, style, children }: MenuTransitionRootProps): ReactNode {
  const parentMenu = useMenuContext();
  const [controller] = useState(() =>
    createMenuTransition({
      onViewEnter: (view) => view.menu.highlightFirstItem({ preventScroll: true }),
      onViewExit: (view) => view.triggerElement?.focus({ preventScroll: true }),
    })
  );
  const [container, setContainer] = useState<HTMLElement | null>(null);
  const size = useSnapshot(controller.size);

  useEffect(() => () => controller.destroy(), [controller]);
  useEffect(() => {
    if (!parentMenu.state.open) controller.reset();
  }, [controller, parentMenu.state.open]);

  const context = useMemo(() => ({ controller, parentMenu, container }), [container, controller, parentMenu]);

  if (!isValidElement(render)) throw new Error('Menu.TransitionRoot requires a Menu.Content render element');

  const renderRef = (render.props as { ref?: React.Ref<HTMLDivElement> }).ref;
  const contentStyle = getSizedContentStyle(render.props.style, size);

  return cloneElement(
    render,
    { ref: composeRefs(renderRef, setContainer), style: contentStyle },
    <MenuTransitionRootContextProvider value={context}>
      <RootPanel controller={controller} container={container} className={className} style={style}>
        {children}
      </RootPanel>
    </MenuTransitionRootContextProvider>
  );
}

export namespace MenuTransitionRoot {
  export type Props = MenuTransitionRootProps;
  export type State = MenuTransitionPanelState;
}
