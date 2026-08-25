import { getStateDataAttrs, type StateAttrMap } from '@videojs/core/dom';
import { isFunction } from '@videojs/utils/predicate';
import { resolveClassName } from '@videojs/utils/style';
import type { CSSProperties, ReactElement, Ref } from 'react';
import { cloneElement, createElement, isValidElement } from 'react';

import { mergeProps } from './merge-props';
import type { HTMLProps, RenderProp } from './types';
import { composeRefs } from './use-composed-refs';

/** Check if a value is a render prop (function or React element). */
export function isRenderProp<Value>(value: Value): value is Value & RenderProp<Value> {
  return isFunction(value) || isValidElement(value);
}

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

function resolveStyle<State>(
  style: CSSProperties | ((state: State) => CSSProperties | undefined) | undefined,
  state: State
): CSSProperties | undefined {
  return isFunction(style) ? style(state) : style;
}

function getElementRef(element: ReactElement): Ref<unknown> | undefined {
  // React 19+ uses element.props.ref, older versions use element.ref
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const elementAny =
    /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ element as any;
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
 * @public
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

  // Generate data attributes only when a component explicitly opts in with a
  // mapping. State is still passed to render/className/style callbacks.
  const stateDataAttrs = stateAttrMap ? getStateDataAttrs(state, stateAttrMap) : {};

  // Merge: state data attrs first, then props (so props can override)
  const propsArray = /* SAFETY: React element props are object values consumed by the generic merge helper. */ (
    Array.isArray(props) ? props : props ? [props] : []
  ) as React.ComponentPropsWithRef<TagName>[];
  const mergedProps = mergeProps<TagName>(
    /* SAFETY: State data attributes are valid attributes for every intrinsic HTML element. */ stateDataAttrs as React.ComponentPropsWithRef<TagName>,
    ...propsArray
  );

  if (className !== undefined) {
    // Add resolved className and style
    mergedProps.className = mergedProps.className ? `${mergedProps.className} ${className}` : className;
  }

  if (style !== undefined) {
    mergedProps.style = mergedProps.style
      ? {
          .../* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ (mergedProps.style as CSSProperties),
          ...style,
        }
      : style;
  }

  if (isFunction(render)) {
    // Render function: call with props and state
    const mergedRef = composeRefs(
      ref,
      /* SAFETY: The caller pairs RenderedElementType with the selected intrinsic element. */ mergedProps.ref as Ref<RenderedElementType>
    );
    return render(
      /* SAFETY: The surrounding typed API establishes the asserted contract at this boundary. */ {
        ...mergedProps,
        ref: mergedRef,
      } as HTMLProps,
      state
    );
  }

  if (isValidElement(render)) {
    const elementRef = getElementRef(render);

    const mergedRef = composeRefs(ref, mergedProps.ref, elementRef);

    const elementProps = mergeProps(
      mergedProps,
      /* SAFETY: A valid render element's props are merged into the selected intrinsic element. */ render.props as React.ComponentPropsWithRef<TagName>
    );
    elementProps.ref = mergedRef;

    return cloneElement(render, elementProps);
  }

  // Default tag
  const mergedRef = composeRefs(
    ref,
    /* SAFETY: The caller pairs RenderedElementType with the selected intrinsic element. */ mergedProps.ref as Ref<RenderedElementType>
  );
  Object.assign(mergedProps, { ref: mergedRef });

  return createElement(element, mergedProps);
}

export namespace renderElement {
  export type ComponentProps<State> = UseRenderComponentProps<State>;
  export type Parameters<State, RenderedElementType extends Element> = UseRenderParameters<State, RenderedElementType>;
}
