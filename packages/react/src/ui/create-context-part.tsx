'use client';

import type { StateAttrMap } from '@videojs/core';
import type { ForwardedRef, ForwardRefExoticComponent, RefAttributes } from 'react';
import { forwardRef } from 'react';

import type { UIComponentProps } from '../utils/types';
import { renderElement } from '../utils/use-render';

/** Shape that compound context values must satisfy for parts to consume. */
interface PartContextValue<State extends object> {
  state: State;
  stateAttrMap: StateAttrMap<State>;
}

interface ContextPartConfig<State extends object> {
  displayName: string;
  tag: keyof React.JSX.IntrinsicElements;
  useContext: () => PartContextValue<State>;
  staticProps?: Record<string, unknown>;
}

/**
 * Creates a compound-component part that consumes context and applies
 * data attributes from `ctx.state` + `ctx.stateAttrMap`.
 */
export function createContextPart<State extends object>(
  config: ContextPartConfig<State>
): ForwardRefExoticComponent<UIComponentProps<typeof config.tag, State> & RefAttributes<HTMLElement>> {
  const { displayName, tag, useContext, staticProps } = config;

  const Component = forwardRef(function ContextPart(
    componentProps: Record<string, unknown>,
    forwardedRef: ForwardedRef<HTMLElement>
  ) {
    const { render, className, style, ...elementProps } = componentProps;

    const context = useContext();

    return renderElement(tag, { render, className, style } as Parameters<typeof renderElement>[1], {
      state: context.state,
      stateAttrMap: context.stateAttrMap,
      ref: forwardedRef,
      props: staticProps ? [staticProps, elementProps] : [elementProps],
    });
  });

  Component.displayName = displayName;

  return Component as ForwardRefExoticComponent<UIComponentProps<typeof tag, State> & RefAttributes<HTMLElement>>;
}
