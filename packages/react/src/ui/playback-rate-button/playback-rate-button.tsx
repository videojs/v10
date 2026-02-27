'use client';

import type { StateAttrMap } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';
import { useButton } from '../hooks/use-button';

const RATES = [0.5, 1, 1.2, 1.5, 1.7, 2] as const;

// FIXME: Replace with state/props from core.
export type PlaybackRateButtonState = {
  rate: (typeof RATES)[number];
};
type PlaybackRateButtonCoreProps = {
  /** Custom label for the button. */
  label?: string | ((state: PlaybackRateButtonState) => string) | undefined;
  /** Whether the button is disabled. */
  disabled?: boolean | undefined;
};
const PlaybackRateButtonDataAttrs = {
  /** Present when the playback rate is active. */
  rate: 'data-playback-rate',
} as const satisfies StateAttrMap<PlaybackRateButtonState>;

export interface PlaybackRateButtonProps
  extends UIComponentProps<'button', PlaybackRateButtonState>,
    PlaybackRateButtonCoreProps {}

const DEBUG = true;

/**
 * A button that toggles playback rate.
 *
 * @example
 * ```tsx
 * <PlaybackRateButton />
 *
 * <PlaybackRateButton
 *   render={(props, state) => (
 *     <button {...props}>
 *       {state.rate}&times;
 *     </button>
 *   )}
 * />
 * ```
 */
export const PlaybackRateButton = forwardRef(function PlaybackRateButton(
  componentProps: PlaybackRateButtonProps,
  forwardedRef: ForwardedRef<HTMLButtonElement>
) {
  const { render, className, style, label, disabled, ...elementProps } = componentProps;

  // FIXME: Replace with actual playback rate state
  const [rate, setRate] = useState<PlaybackRateButtonState['rate']>(1);

  const { getButtonProps, buttonRef } = useButton({
    displayName: 'PlaybackRateButton',
    onActivate: () =>
      setRate((currentRate) => {
        // FIXME: Replace with actual toggle logic
        const rates: PlaybackRateButtonState['rate'][] = [...RATES];
        const currentIndex = rates.indexOf(currentRate);
        const nextIndex = (currentIndex + 1) % rates.length;
        return rates[nextIndex] ?? 1;
      }),
    isDisabled: () => disabled ?? false,
  });

  if (!DEBUG) return null;

  return renderElement(
    'button',
    { render, className, style },
    {
      state: { rate }, // FIXME: Replace with actual toggle logic
      stateAttrMap: PlaybackRateButtonDataAttrs,
      ref: [forwardedRef, buttonRef],
      props: [elementProps, getButtonProps()],
    }
  );
});

export namespace PlaybackRateButton {
  export type Props = PlaybackRateButtonProps;
  export type State = PlaybackRateButtonState;
}
