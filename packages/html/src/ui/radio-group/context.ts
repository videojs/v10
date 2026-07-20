import { createContext } from '@videojs/element/context';

export interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
}

const RADIO_GROUP_CONTEXT_KEY = Symbol('@videojs/radio-group');

export const radioGroupContext = createContext<RadioGroupContextValue>(RADIO_GROUP_CONTEXT_KEY);
