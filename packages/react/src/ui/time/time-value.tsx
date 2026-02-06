'use client';

import { TimeCore } from '@videojs/core';
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
    logMissingFeature('Time.Value', 'time');
    return null;
  }

  const state = core.getState(time);

  // Render negative sign as aria-hidden span for remaining time
  const content =
    state.type === 'remaining' && state.seconds < 0 ? (
      <>
        <span aria-hidden="true">{negativeSign ?? '-'}</span>
        {state.text.replace(/^-/, '')}
      </>
    ) : (
      state.text
    );

  return renderElement(
    'time',
    { render, className, style },
    {
      state,
      ref: [forwardedRef],
      props: [
        {
          datetime: state.datetime,
          children: content,
          ...core.getAttrs(time),
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
