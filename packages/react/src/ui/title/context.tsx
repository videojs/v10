import type { TitleCore } from '@videojs/core';
import { createContext, type ProviderProps, useContext } from 'react';

export interface TitleContextValue {
  state: TitleCore.State;
}

const TitleContext = createContext<TitleContextValue | null>(null);

export function TitleProvider({ value, children }: ProviderProps<TitleContextValue>) {
  return <TitleContext.Provider value={value}>{children}</TitleContext.Provider>;
}

export function useTitleContext(): TitleContextValue {
  const ctx = useContext(TitleContext);
  if (!ctx) throw new Error('Title child compounds must be used within a Title.Root');

  return ctx;
}
