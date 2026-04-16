'use client';

import type {
  InputFeedbackCurrentValues,
  InputFeedbackDataState,
  InputFeedbackItemDataState,
  InputFeedbackVolumeLevel,
} from '@videojs/core';
import { createContext, type ProviderProps, useContext } from 'react';

export interface InputFeedbackRootContextValue {
  state: InputFeedbackDataState;
  volumePercentage: string;
  currentVolumeLevel: InputFeedbackVolumeLevel | null;
  currentValues: InputFeedbackCurrentValues;
}

export interface InputFeedbackItemContextValue {
  state: InputFeedbackItemDataState;
}

const InputFeedbackRootContext = createContext<InputFeedbackRootContextValue | null>(null);
const InputFeedbackItemContext = createContext<InputFeedbackItemContextValue | null>(null);

type InputFeedbackRootProviderProps = ProviderProps<InputFeedbackRootContextValue>;
type InputFeedbackItemProviderProps = ProviderProps<InputFeedbackItemContextValue>;

export function InputFeedbackRootProvider({ value, children }: InputFeedbackRootProviderProps) {
  return <InputFeedbackRootContext.Provider value={value}>{children}</InputFeedbackRootContext.Provider>;
}

export function InputFeedbackItemProvider({ value, children }: InputFeedbackItemProviderProps) {
  return <InputFeedbackItemContext.Provider value={value}>{children}</InputFeedbackItemContext.Provider>;
}

export function useInputFeedbackRootContext(): InputFeedbackRootContextValue {
  const ctx = useContext(InputFeedbackRootContext);
  if (!ctx) throw new Error('InputFeedback compound components must be used within an InputFeedback.Root');
  return ctx;
}

export function useInputFeedbackItemContext(): InputFeedbackItemContextValue {
  const ctx = useContext(InputFeedbackItemContext);
  if (!ctx) throw new Error('InputFeedback child compounds must be used within an InputFeedback.Item');
  return ctx;
}
