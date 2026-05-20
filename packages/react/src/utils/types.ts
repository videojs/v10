import type { ComponentPropsWithRef, CSSProperties, ElementType, ReactElement } from 'react';

/** Props that can be spread on any HTML element. */
export type HTMLProps<T = any> = React.HTMLAttributes<T> & {
  ref?: React.Ref<T> | undefined;
};

/** Render function signature - receives props and state, returns element. */
export type RenderFunction<Props, State> = (props: Props, state: State) => ReactElement | null;

/** Render prop - either a React element or a render function. */
export type RenderProp<State> = ReactElement | RenderFunction<HTMLProps, State>;

/**
 * Standard props for UI components.
 *
 * Provides consistent API across all UI components:
 * - `className` as string or function of state
 * - `style` as object or function of state
 * - `render` prop for element customization
 */
export type UIComponentProps<TagName extends keyof React.JSX.IntrinsicElements, State> = Omit<
  React.JSX.IntrinsicElements[TagName],
  'className' | 'style'
> & {
  /** Class name or function returning class name from state. */
  className?: string | ((state: State) => string | undefined) | undefined;
  /** Style or function returning style from state. */
  style?: CSSProperties | ((state: State) => CSSProperties | undefined) | undefined;
  /** Render prop for custom element. */
  render?: RenderProp<State> | undefined;
};

/** Extract props type from an element type. */
export type PropsOf<T extends ElementType> = ComponentPropsWithRef<T>;
