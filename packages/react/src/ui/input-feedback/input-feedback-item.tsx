'use client';

import {
  EMPTY_INPUT_FEEDBACK_ITEM_STATE,
  getInputFeedbackItemDefinition,
  getInputFeedbackItemState,
  getRenderedInputFeedbackItemState,
  type InputFeedbackAction,
  InputFeedbackCSSVars,
  type InputFeedbackGroup,
  InputFeedbackItemDataAttrs,
  type InputFeedbackItemDataState,
  type InputFeedbackItemDefinition,
  isInputFeedbackItemPresent,
  isVolumeInputFeedbackItem,
} from '@videojs/core';
import { createTransition } from '@videojs/core/dom';
import type { CSSProperties, ForwardedRef, ReactNode } from 'react';
import { forwardRef, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import type { UIComponentProps } from '../../utils/types';
import { useDestroy } from '../../utils/use-destroy';
import { renderElement } from '../../utils/use-render';
import { InputFeedbackItemProvider, useInputFeedbackRootContext } from './context';

interface InputFeedbackItemActionProps extends UIComponentProps<'div', InputFeedbackItemDataState> {
  action: InputFeedbackAction;
  children?: ReactNode | undefined;
  group?: never;
}

interface InputFeedbackItemGroupProps extends UIComponentProps<'div', InputFeedbackItemDataState> {
  action?: never;
  children?: ReactNode | undefined;
  group: InputFeedbackGroup;
}

export type InputFeedbackItemProps = InputFeedbackItemActionProps | InputFeedbackItemGroupProps;

export const InputFeedbackItem = forwardRef(function InputFeedbackItem(
  componentProps: InputFeedbackItemProps,
  forwardedRef: ForwardedRef<HTMLDivElement>
) {
  const { render, className, style, children, action, group, ...elementProps } = componentProps;

  const { state: rootState, volumePercentage, currentVolumeLevel } = useInputFeedbackRootContext();
  const elementRef = useRef<HTMLDivElement>(null);
  const definition = getInputFeedbackItemDefinition(action, group);
  const currentItemState = definition
    ? getInputFeedbackItemState(rootState, definition, currentVolumeLevel)
    : EMPTY_INPUT_FEEDBACK_ITEM_STATE;
  const snapshotRef = useRef(currentItemState);
  const [transition] = useState(() => createTransition());
  useDestroy(transition);

  const transitionState = useSyncExternalStore(
    (callback) => transition.state.subscribe(callback),
    () => transition.state.current,
    () => transition.state.current
  );

  const itemState = getRenderedInputFeedbackItemState(currentItemState, snapshotRef.current, transitionState);
  const cssVarStyle = getInputFeedbackItemCSSVars(definition, volumePercentage);

  useEffect(() => {
    if (!definition) return;

    if (currentItemState.active) {
      snapshotRef.current = currentItemState;

      const { active, status } = transition.state.current;
      if (!active || status === 'ending') {
        void transition.open();
      }
      return;
    }

    const { active, status } = transition.state.current;
    if (active && status !== 'ending') {
      void transition.close(elementRef.current);
    }
  }, [currentItemState, definition, transition]);

  if (!isInputFeedbackItemPresent(currentItemState, transitionState)) {
    return null;
  }

  return (
    <InputFeedbackItemProvider value={{ state: itemState }}>
      {renderElement(
        'div',
        { render, className, style },
        {
          state: itemState,
          stateAttrMap: InputFeedbackItemDataAttrs,
          ref: [forwardedRef, elementRef],
          props: [{ children, style: cssVarStyle }, elementProps],
        }
      )}
    </InputFeedbackItemProvider>
  );
});

export namespace InputFeedbackItem {
  export type Props = InputFeedbackItemProps;
  export type Group = InputFeedbackGroup;
  export type Action = InputFeedbackAction;
  export type State = InputFeedbackItemDataState;
}

function getInputFeedbackItemCSSVars(
  definition: InputFeedbackItemDefinition | null,
  volumePercentage: string
): CSSProperties | undefined {
  if (!definition || !isVolumeInputFeedbackItem(definition)) return undefined;

  return {
    [InputFeedbackCSSVars.volumePercentage]: volumePercentage,
  } as CSSProperties;
}
