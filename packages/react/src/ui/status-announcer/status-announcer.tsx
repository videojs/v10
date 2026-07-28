'use client';

import { createStatusAnnouncerLabels, StatusAnnouncerCore } from '@videojs/core';
import { isSliderFocused, subscribeToStatusAnnouncer } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useEffect, useState, useSyncExternalStore } from 'react';
import { useLocale, useTranslator } from '../../i18n/context';
import { useContainer, usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { renderElement } from '../../utils/use-render';

export interface StatusAnnouncerProps
  extends UIComponentProps<'div', StatusAnnouncerCore.State>,
    Pick<StatusAnnouncerCore.Props, 'closeDelay' | 'labels'> {}

export const StatusAnnouncer = forwardRef(function StatusAnnouncer(
  componentProps: StatusAnnouncerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, closeDelay, labels, ...elementProps } = componentProps;
  const translator = useTranslator();
  const locale = useLocale();
  const [core] = useState(() => new StatusAnnouncerCore());
  const store = usePlayer();
  const container = useContainer();
  useDestroy(core);
  core.setProps({
    closeDelay,
    labels: {
      ...createStatusAnnouncerLabels(translator, locale),
      ...labels,
    },
    shouldAnnounceSeek: () => !container || !isSliderFocused(container),
    shouldAnnounceVolume: () => !container || !isSliderFocused(container),
  });

  useEffect(() => subscribeToStatusAnnouncer(store, core), [core, store]);

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
        elementProps,
        {
          role: 'status',
          children: state.label ?? '',
        },
      ],
    }
  );
});

export namespace StatusAnnouncer {
  export type Props = StatusAnnouncerProps;
  export type State = StatusAnnouncerCore.State;
}
