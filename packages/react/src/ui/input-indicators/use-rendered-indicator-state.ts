'use client';

import { getRenderedIndicatorState, type IndicatorLifecycleState, isIndicatorPresent } from '@videojs/core';
import { createTransition } from '@videojs/core/dom';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { useDestroy } from '../../utils/use-destroy';

export function useRenderedIndicatorState<State extends IndicatorLifecycleState>(currentState: State) {
  const elementRef = useRef<HTMLElement>(null);
  const currentStateRef = useRef(currentState);
  const snapshotRef = useRef(currentState);
  const [transition] = useState(() => createTransition());
  useDestroy(transition);
  currentStateRef.current = currentState;

  const transitionState = useSyncExternalStore(
    (callback) => transition.state.subscribe(callback),
    () => transition.state.current,
    () => transition.state.current
  );

  const { generation, open } = currentState;

  useEffect(() => {
    if (open) {
      const nextState = currentStateRef.current;
      if (nextState.generation !== generation) return;

      snapshotRef.current = nextState;
      void transition.open();
      return;
    }

    const { active, status } = transition.state.current;
    if (active && status !== 'ending') {
      void transition.close(elementRef.current);
    }
  }, [generation, open, transition]);

  return {
    elementRef,
    present: isIndicatorPresent(currentState, transitionState),
    state: getRenderedIndicatorState(currentState, snapshotRef.current, transitionState),
  };
}
