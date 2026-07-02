'use client';

import { createInputIndicatorLabels, StatusAnnouncerCore } from '@videojs/core';
import type { ForwardedRef } from 'react';
import { forwardRef, useState, useSyncExternalStore } from 'react';

import { useTranslator } from '../../i18n/context';
import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { renderElement } from '../../utils/use-render';
import { useInputActionSubscription } from '../input-indicators/use-input-action-subscription';

export interface StatusAnnouncerProps
  extends UIComponentProps<'div', StatusAnnouncerCore.State>,
    Omit<StatusAnnouncerCore.Props, 'labels'> {}

export const StatusAnnouncer = forwardRef(function StatusAnnouncer(
  componentProps: StatusAnnouncerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, closeDelay, ...elementProps } = componentProps;
  const translator = useTranslator();
  const [core] = useState(() => new StatusAnnouncerCore());
  useDestroy(core);
  core.setProps({ closeDelay, labels: createInputIndicatorLabels(translator) });

  useInputActionSubscription((event, snapshot) => {
    core.processEvent(event, snapshot);
  });

  const state = useSyncExternalStore(
    (callback) => core.state.subscribe(callback),
    () => core.state.current,
    () => core.state.current
  );

  return renderElement(
    'div',
    { render, className, style },
    {
      state,
      ref: forwardedRef,
      props: [
        {
          role: 'status',
          'aria-label': state.label ?? undefined,
        },
        elementProps,
      ],
    }
  );
});

export namespace StatusAnnouncer {
  export type Props = StatusAnnouncerProps;
  export type State = StatusAnnouncerCore.State;
}
