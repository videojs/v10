'use client';

import type { HTMLAttributes, PointerEvent as ReactPointerEvent, ReactNode } from 'react';
import { forwardRef, useEffect, useRef } from 'react';

import { I18nProvider } from '../i18n/provider-instance';
import { useComposedRefs } from '../utils/use-composed-refs';
import { useContainerAttach } from './context';

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  children?: ReactNode;
}

export const Container = forwardRef<HTMLDivElement, ContainerProps>(function Container(
  { children, tabIndex = 0, ...props },
  ref
) {
  const setContainer = useContainerAttach();
  const internalRef = useRef<HTMLDivElement>(null);
  const composedRef = useComposedRefs(ref, internalRef);

  useEffect(() => {
    setContainer?.(internalRef.current);
    return () => setContainer?.(null);
  }, [setContainer]);

  const handlePointerUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    props.onPointerUp?.(event);
    const el = internalRef.current;
    if (!el) return;
    // If nothing inside has focus, grab it so keyboard events reach hotkey listeners.
    if (!el.contains(document.activeElement) || document.activeElement === document.body) {
      el.focus({ preventScroll: true });
    }
  };

  return (
    <I18nProvider langRootRef={internalRef}>
      <div ref={composedRef} tabIndex={tabIndex} {...props} onPointerUp={handlePointerUp}>
        {children}
      </div>
    </I18nProvider>
  );
});

export namespace Container {
  export type Props = ContainerProps;
}
