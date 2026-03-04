'use client';

import type { ForwardedRef, ForwardRefExoticComponent } from 'react';
import { forwardRef } from 'react';

import type { renderElement as renderElementFn } from '../utils/use-render';
import { renderElement } from '../utils/use-render';

interface ContextPartConfig {
  displayName: string;
  tag: keyof React.JSX.IntrinsicElements;
  useContext: () => { state: object; stateAttrMap: object };
  staticProps?: Record<string, unknown>;
}

/**
 * Creates a compound-component part that consumes context and applies
 * data attributes from `ctx.state` + `ctx.stateAttrMap`.
 */
export function createContextPart<Props extends object>(config: ContextPartConfig): ForwardRefExoticComponent<Props> {
  const { displayName, tag, useContext, staticProps } = config;

  const Component = forwardRef(function ContextPart(
    componentProps: Record<string, unknown>,
    forwardedRef: ForwardedRef<Element>
  ) {
    const { render, className, style, ...elementProps } = componentProps;
    const context = useContext();

    return renderElement(tag, { render, className, style } as renderElementFn.ComponentProps<object>, {
      state: context.state,
      stateAttrMap: context.stateAttrMap,
      ref: forwardedRef,
      props: staticProps ? [staticProps, elementProps] : [elementProps],
    });
  });

  Component.displayName = displayName;

  return Component as ForwardRefExoticComponent<Props>;
}
