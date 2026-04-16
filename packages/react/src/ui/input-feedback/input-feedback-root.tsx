'use client';

import type {
  InputFeedbackDataState,
  InputFeedbackEvent,
  InputFeedbackLabels,
  MediaVolumeState,
  StateAttrMap,
} from '@videojs/core';
import {
  getInputFeedbackPredictedVolumeState,
  getInputFeedbackRootDerivedState,
  InputFeedbackCore,
} from '@videojs/core';
import {
  getGestureCoordinator,
  getHotkeyCoordinator,
  selectFullscreen,
  selectPiP,
  selectPlayback,
  selectTextTrack,
  selectTime,
  selectVolume,
} from '@videojs/core/dom';
import type { ForwardedRef } from 'react';
import { forwardRef, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useContainer, usePlayer } from '../../player/context';
import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { renderElement } from '../../utils/use-render';
import { InputFeedbackRootProvider } from './context';

const InputFeedbackRootDataAttrs = {} as const satisfies StateAttrMap<InputFeedbackDataState>;

export interface InputFeedbackRootProps extends UIComponentProps<'div', InputFeedbackDataState> {
  /** Override default text labels for i18n. */
  labels?: Partial<InputFeedbackLabels> | undefined;
}

export const InputFeedbackRoot = forwardRef(function InputFeedbackRoot(
  componentProps: InputFeedbackRootProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, labels: labelsProp, ...elementProps } = componentProps;

  const container = useContainer();
  const store = usePlayer();
  const volume: MediaVolumeState | undefined = usePlayer(selectVolume);
  const playback = usePlayer(selectPlayback);
  const textTrack = usePlayer(selectTextTrack);
  const time = usePlayer(selectTime);
  const elementRef = useRef<HTMLDivElement>(null);

  const [core] = useState(() => new InputFeedbackCore());
  useDestroy(core);

  if (labelsProp) Object.assign(core.labels, labelsProp);

  const state = useSyncExternalStore(
    (callback) => core.state.subscribe(callback),
    () => core.state.current,
    () => core.state.current
  );
  const renderState: InputFeedbackDataState = {
    ...state,
    transitionStarting: false,
    transitionEnding: false,
  };
  const rootDerivedState = getInputFeedbackRootDerivedState(renderState, core.labels, {
    playback,
    textTrack,
    time,
    volume,
  });

  const storeRef = useRef(store);
  storeRef.current = store;

  useEffect(() => {
    if (!container) return;

    const handleEvent = (event: InputFeedbackEvent) => {
      const state = storeRef.current.state;
      const volumeState = selectVolume(state);
      const feedbackState = core.state.current;
      const feedbackVolume = getInputFeedbackPredictedVolumeState(event, feedbackState, volumeState);

      core.processEvent(event, {
        paused: selectPlayback(state)?.paused,
        volume: feedbackVolume?.volume,
        muted: feedbackVolume?.muted,
        fullscreen: selectFullscreen(state)?.fullscreen,
        subtitlesShowing: selectTextTrack(state)?.subtitlesShowing,
        pip: selectPiP(state)?.pip,
        currentTime: selectTime(state)?.currentTime,
        duration: selectTime(state)?.duration,
      });
    };

    const gestureUnsubscribe = getGestureCoordinator(container).subscribe(handleEvent);
    const hotkeyUnsubscribe = getHotkeyCoordinator(container).subscribe(handleEvent);

    return () => {
      gestureUnsubscribe();
      hotkeyUnsubscribe();
    };
  }, [container, core]);

  return (
    <InputFeedbackRootProvider
      value={{
        state: renderState,
        ...rootDerivedState,
      }}
    >
      {renderElement(
        'div',
        { render, className, style },
        {
          state: renderState,
          stateAttrMap: InputFeedbackRootDataAttrs,
          ref: [forwardedRef, elementRef],
          props: [elementProps],
        }
      )}
    </InputFeedbackRootProvider>
  );
});

export namespace InputFeedbackRoot {
  export type Props = InputFeedbackRootProps;
  export type State = InputFeedbackDataState;
}
