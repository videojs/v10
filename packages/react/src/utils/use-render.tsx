'use client';

import { getStateDataAttrs, type StateAttrMap } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { CSSProperties, ReactElement, Ref } from 'react';
import { cloneElement, createElement, isValidElement } from 'react';
import { mergeProps } from './merge-props';
import type { HTMLProps, RenderProp } from './types';
import { composeRefs } from './use-composed-refs';

type IntrinsicTagName = keyof React.JSX.IntrinsicElements;

export interface UseRenderComponentProps<State> {
  className?: string | ((state: State) => string | undefined) | undefined;
  style?: CSSProperties | ((state: State) => CSSProperties | undefined) | undefined;
  render?: RenderProp<State> | undefined;
}

export interface UseRenderParameters<State, RenderedElementType extends Element> {
  state: State;
  ref?: Ref<RenderedElementType> | Ref<RenderedElementType>[] | undefined;
  props?: object | object[] | undefined;
  stateAttrMap?: StateAttrMap<State> | undefined;
}

function resolveClassName<State>(
  className: string | ((state: State) => string | undefined) | undefined,
  state: State
): string | undefined {
  return isFunction(className) ? className(state) : className;
}

function resolveStyle<State>(
  style: CSSProperties | ((state: State) => CSSProperties | undefined) | undefined,
  state: State
): CSSProperties | undefined {
  return isFunction(style) ? style(state) : style;
}

function getElementRef(element: ReactElement): Ref<unknown> | undefined {
  // React 19+ uses element.props.ref, older versions use element.ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elementAny = element as any;
  return elementAny.ref ?? elementAny.props?.ref;
}

/**
 * Render a UI component element.
 *
 * Handles:
 * - Default tag rendering
 * - Render prop (element or function)
 * - Props merging (event handlers chained, className concatenated, style merged)
 * - Ref composition
 * - className/style as functions of state
 *
 * @example
 * ```tsx
 * return renderElement('button', componentProps, {
 *   state,
 *   ref: [forwardedRef, buttonRef],
 *   props: [{ type: 'button' }, elementProps, getButtonProps],
 * });
 * ```
 */
export function renderElement<
  State extends object,
  RenderedElementType extends Element,
  TagName extends IntrinsicTagName,
>(
  element: TagName,
  componentProps: UseRenderComponentProps<State>,
  params: UseRenderParameters<State, RenderedElementType>
): ReactElement {
  const { className: classNameProp, style: styleProp, render } = componentProps;
  const { state, ref, props, stateAttrMap } = params;

  // Resolve className and style if they're functions
  const className = resolveClassName(classNameProp, state);
  const style = resolveStyle(styleProp, state);

  // Generate data attributes from state
  const stateDataAttrs = getStateDataAttrs(state, stateAttrMap);

  // Merge: state data attrs first, then props (so props can override)
  const propsArray = Array.isArray(props) ? props : props ? [props] : [];
  const mergedProps = mergeProps(stateDataAttrs, ...(propsArray as Record<string, unknown>[]));

  if (className !== undefined) {
    // Add resolved className and style
    mergedProps.className = mergedProps.className ? `${mergedProps.className} ${className}` : className;
  }

  if (style !== undefined) {
    mergedProps.style = mergedProps.style ? { ...(mergedProps.style as CSSProperties), ...style } : style;
  }

  if (isFunction(render)) {
    // Render function: call with props and state
    const mergedRef = composeRefs(ref, mergedProps.ref);
    return render({ ...mergedProps, ref: mergedRef } as HTMLProps, state);
  }

  if (isValidElement(render)) {
    const elementRef = getElementRef(render);

    const mergedRef = composeRefs(ref, mergedProps.ref, elementRef);

    const elementProps = mergeProps(mergedProps, render.props as Record<string, unknown>);
    elementProps.ref = mergedRef;

    return cloneElement(render, elementProps);
  }

  // Default tag
  const mergedRef = composeRefs(ref, mergedProps.ref);
  mergedProps.ref = mergedRef;

  return createElement(element, mergedProps);
}

export namespace renderElement {
  export type ComponentProps<State> = UseRenderComponentProps<State>;
  export type Parameters<State, RenderedElementType extends Element> = UseRenderParameters<State, RenderedElementType>;
}
