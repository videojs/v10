'use client';

import type { StateAttrMap } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

// FIXME: Replace with state/props from core.
export type CaptionsButtonState = {
  active: boolean;
};
type CaptionButtonCoreProps = {
  /** Custom label for the button. */
  label?: string | ((state: CaptionsButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
};
const CaptionButtonDataAttrs = {
  /** Present when the captions are active. */
  active: 'data-active',
} as const satisfies StateAttrMap<CaptionsButtonState>;

export interface CaptionsButtonProps extends UIComponentProps<'button', CaptionsButtonState>, CaptionButtonCoreProps {}

const DEBUG = false;

/**
 * A button that toggles captions.
 *
 * @example
 * ```tsx
 * <CaptionsButton />
 *
 * <CaptionsButton
 *   render={(props, state) => (
 *     <button {...props}>
 *       {state.active ? <CaptionsOnIcon /> : <CaptionsOffIcon />}
 *     </button>
 *   )}
 * />
 * ```
 */
export const CaptionsButton = forwardRef(function CaptionsButton(
  componentProps: CaptionsButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled, ...elementProps } = componentProps;

  // FIXME: Replace with actual captions state
  const [isActive, setIsActive] = useState(false);

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'CaptionsButton',
    onActivate: () => setIsActive((active) => !active), // FIXME: Replace with actual toggle logic
    isDisabled: () => disabled ?? false,
  });

  if (!DEBUG) return null;

  return renderElement(
    'button',
    { render, className, style },
    {
      state: { active: isActive }, // FIXME: Replace with actual toggle logic
      stateAttrMap: CaptionButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [elementProps, getButtonProps(), { 'aria-pressed': isActive }],
    }
  );
});

export namespace CaptionsButton {
  export type Props = CaptionsButtonProps;
  export type State = CaptionsButtonState;
}
