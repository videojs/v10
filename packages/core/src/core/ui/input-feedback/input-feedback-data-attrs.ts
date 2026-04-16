import type { TransitionFlags } from '../transition';
import type { InputFeedbackState } from './input-feedback-core';

export type InputFeedbackDataState = InputFeedbackState & TransitionFlags;
