'use client';

import { TimeCore, TimeDataAttrs } from '@videojs/core';
import { logMissingFeature, selectTime } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useState } from 'react';

import { usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { renderElement } from '../../utils/use-render';

export interface ValueProps extends Omit<UIComponentProps<'time', TimeCore.State>, 'children'>, TimeCore.Props {}

/**
 * Displays a formatted time value (current, duration, or remaining).
 *
 * @example
 * ```tsx
 * <Time.Value />
 * <Time.Value type="duration" />
 * <Time.Value type="remaining" negativeSign="−" />
 * ```
 */
export const Value = forwardRef(function Value(
  componentProps: ValueProps,
  forwardedRef: ForwardedRef<HTMLTimeElement>
) {
  const { render, className, style, type, negativeSign, label, ...elementProps } = componentProps;

  const time = usePlayer(selectTime);

  const [core] = useState(() => new TimeCore());
  core.setProps({ type, negativeSign, label });

  if (!time) {
    if (__DEV__) logMissingFeature('Time.Value', 'time');
    return null;
  }

  const state = core.getState(time);

  const content = state.negative ? (
    <>
      <span aria-hidden="true">{core.props.negativeSign}</span>
      {state.text}
    </>
  ) : (
    state.text
  );

  return renderElement(
    'time',
    { render, className, style },
    {
      state,
      stateAttrMap: TimeDataAttrs,
      ref: [forwardedRef],
      props: [
        {
          dateTime: state.datetime,
          children: content,
          ...core.getAttrs(state),
        },
        elementProps,
      ],
    }
  );
});

export namespace Value {
  export type Props = ValueProps;
  export type State = TimeCore.State;
}
