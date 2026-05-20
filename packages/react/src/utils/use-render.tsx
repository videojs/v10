'use client';

import { getStateDataAttrs, type StateAttrMap } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import type { CSSProperties, ReactElement, Ref } from 'react';
import { cloneElement, createElement, isValidElement } from 'react';
import { mergeProps } from './merge-props';
import type { HTMLProps, RenderProp } from './types';
import { composeRefs } from './use-composed-refs';

/** Check if a value is a render prop (function or React element). */
export function isRenderProp(value: unknown): value is RenderProp<unknown> {
  return isFunction(value) || isValidElement(value);
}

type IntrinsicTagName = keyof React.JSX.IntrinsicElements;

/** Standard component props consumed by `renderElement` — also re-exposed as `renderElement.ComponentProps`. */
export interface UseRenderComponentProps<State> {
  /** Class name or function returning class name from state. */
  className?: string | ((state: State) => string | undefined) | undefined;
  /** Style or function returning style from state. */
  style?: CSSProperties | ((state: State) => CSSProperties | undefined) | undefined;
  /** Render prop that overrides the default element. */
  render?: RenderProp<State> | undefined;
}

/** Render-time parameters consumed by `renderElement` — also re-exposed as `renderElement.Parameters`. */
export interface UseRenderParameters<State, RenderedElementType extends Element> {
  /** Current component state. Passed to `render` props and resolved className/style functions. */
  state: State;
  /** Ref(s) to attach to the rendered element. */
  ref?: Ref<RenderedElementType> | Ref<RenderedElementType>[] | undefined;
  /** Prop object(s) to merge with the rendered element's attributes. */
  props?: object | object[] | undefined;
  /** Mapping of state fields to `data-*` attributes for styling. */
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
 * Render a UI primitive element with merged props, composed refs, and a `render` override.
 *
 * Resolves state-dependent `className` / `style`, merges state-derived data
 * attributes with caller props, composes refs, and dispatches between the
 * default tag, a `render` element, and a `render` function.
 *
 * @public
 * @param element - Default intrinsic tag to render when no `render` override is provided.
 * @param componentProps - Standard UI props (`className`, `style`, `render`).
 * @param params - Render parameters including state, refs, prop objects, and state attribute map.
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
): ReactElement | null {
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
