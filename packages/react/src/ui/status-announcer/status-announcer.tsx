'use client';

import { StatusAnnouncerCore } from '@videojs/core';
import { getMediaSnapshot, isSliderFocused, visuallyHiddenStyle } from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useEffect, useState, useSyncExternalStore } from 'react';

import { useContainer, usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { renderElement } from '../../utils/use-render';

export interface StatusAnnouncerProps
  extends UIComponentProps<'div', StatusAnnouncerCore.State>,
    StatusAnnouncerCore.Props {}

export const StatusAnnouncer = forwardRef(function StatusAnnouncer(
  componentProps: StatusAnnouncerProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, closeDelay, labels, shouldAnnounceSeek, shouldAnnounceVolume, ...elementProps } =
    componentProps;
  const [core] = useState(() => new StatusAnnouncerCore());
  const store = usePlayer();
  const container = useContainer();
  useDestroy(core);
  core.setProps({
    closeDelay,
    labels,
    shouldAnnounceSeek: (snapshot) =>
      shouldAnnounceSeek?.(snapshot) !== false && (!container || !isSliderFocused(container)),
    shouldAnnounceVolume: (snapshot) =>
      shouldAnnounceVolume?.(snapshot) !== false && (!container || !isSliderFocused(container)),
  });

  useEffect(() => {
    core.resetSnapshot();
    core.processSnapshot(getMediaSnapshot(store));
    return store.subscribe(() => core.processSnapshot(getMediaSnapshot(store)));
  }, [core, store]);

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
          children: <span style={visuallyHiddenStyle}>{state.label ?? ''}</span>,
        },
      ],
    }
  );
});

export namespace StatusAnnouncer {
  export type Props = StatusAnnouncerProps;
  export type State = StatusAnnouncerCore.State;
}
