import type {
  InputFeedbackCurrentValues,
  InputFeedbackDataState,
  InputFeedbackItemDataState,
  InputFeedbackVolumeLevel,
  StateAttrMap,
} from '@videojs/core';
import { createContext } from '@videojs/element/context';

export interface InputFeedbackContextValue {
  state: InputFeedbackDataState;
  volumePercentage: string;
  currentVolumeLevel: InputFeedbackVolumeLevel | null;
  currentValues: InputFeedbackCurrentValues;
}

export interface InputFeedbackItemContextValue {
  state: InputFeedbackItemDataState;
  stateAttrMap: StateAttrMap<InputFeedbackItemDataState>;
}

const INPUT_FEEDBACK_CONTEXT_KEY = Symbol('@videojs/input-feedback');
const INPUT_FEEDBACK_ITEM_CONTEXT_KEY = Symbol('@videojs/input-feedback-item');

export const inputFeedbackContext = createContext<InputFeedbackContextValue>(INPUT_FEEDBACK_CONTEXT_KEY);
export const inputFeedbackItemContext = createContext<InputFeedbackItemContextValue>(INPUT_FEEDBACK_ITEM_CONTEXT_KEY);
