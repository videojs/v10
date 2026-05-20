'use client';

import { createButton } from '@videojs/core/dom';
import type { ComponentPropsWithRef, Ref } from 'react';
import { useCallback } from 'react';
import { mergeProps } from '../../utils/merge-props';

/** Parameters for the `useButton` hook. */
export interface UseButtonParameters {
  /** Component name used in dev-mode warnings (e.g. when not rendering a `<button>`). */
  displayName: string;
  /** Called when the button is activated by click or keyboard. */
  onActivate: () => void;
  /** Returns whether the button is currently disabled. */
  isDisabled: () => boolean;
}

/** Return shape of the `useButton` hook. */
export interface UseButtonReturnValue {
  /** Returns merged button props, optionally combined with caller-supplied props. */
  getButtonProps: (externalProps?: ComponentPropsWithRef<'button'>) => ComponentPropsWithRef<'button'>;
  /** Ref to attach to the underlying button element for dev warnings. */
  buttonRef: Ref<HTMLElement>;
}

/**
 * Hook for button behavior with keyboard and pointer interaction.
 *
 * @example
 * ```tsx
 * const { getButtonProps, buttonRef } = useButton({
 *   displayName: 'PlayButton',
 *   onActivate: () => togglePlayback(),
 *   isDisabled: () => disabled,
 * });
 *
 * return useRender('button', componentProps, {
 *   state,
 *   ref: [forwardedRef, buttonRef],
 *   props: [elementProps, getButtonProps],
 * });
 * ```
 *
 * @param params - Button configuration with activation handler and disabled check.
 */
export function useButton(params: UseButtonParameters): UseButtonReturnValue {
  const { displayName, onActivate, isDisabled } = params;

  const buttonRef = useCallback(
    (element: HTMLElement | null) => {
      if (__DEV__ && element && element.tagName !== 'BUTTON') {
        console.warn(`${displayName} should render a <button> element for accessibility`);
      }
    },
    [displayName]
  );

  const getButtonProps = useCallback(
    (externalProps?: ComponentPropsWithRef<'button'>): ComponentPropsWithRef<'button'> => {
      const buttonProps = createButton({ onActivate, isDisabled });
      return mergeProps(buttonProps, externalProps);
    },
    [onActivate, isDisabled]
  );

  return { getButtonProps, buttonRef };
}

export namespace useButton {
  export type Parameters = UseButtonParameters;
  export type ReturnValue = UseButtonReturnValue;
}
