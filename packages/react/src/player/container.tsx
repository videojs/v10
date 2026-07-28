'use client';

import { DEFAULT_CONTAINER_ROLE, DEFAULT_CONTAINER_TAB_INDEX, focusContainer } from '@videojs/core/dom';
import { labelText } from '@videojs/core/i18n/text/container';
import { forwardRef, type HTMLAttributes, type PointerEventHandler, type ReactNode, useEffect, useRef } from 'react';
import { useTranslator } from '../i18n/context';
import { useComposedRefs } from '../utils/use-composed-refs';
import { useContainerAttach } from './context';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  {
    children,
    tabIndex = DEFAULT_CONTAINER_TAB_INDEX,
    role = DEFAULT_CONTAINER_ROLE,
    'aria-label': ariaLabel,
    'aria-labelledby': ariaLabelledBy,
    ...props
  },
  ref
) {
  const setContainer = useContainerAttach();
  const translator = useTranslator();
  const internalRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, internalRef);

  useEffect(() => {
    setContainer?.(internalRef.current);
    return () => setContainer?.(null);
  }, [setContainer]);

  const handlePointerUp: PointerEventHandler<HTMLDivElement> = (event) => {
    props.onPointerUp?.(event);
    const el = internalRef.current;
    if (!el) return;
    focusContainer(el);
  };

  const accessibleNameProps =
    ariaLabel !== undefined || ariaLabelledBy !== undefined
      ? { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy }
      : { 'aria-label': translator(labelText) };

  return (
    <div
      ref={composedRef}
      role={role}
      tabIndex={tabIndex}
      {...accessibleNameProps}
      {...props}
      onPointerUp={handlePointerUp}
    >
      {children}
    </div>
  );
});

export namespace Container {
  export type Props = ContainerProps;
}
