'use client';

import type { MediaError } from '@videojs/core';
import { createContext, useContext } from 'react';

export interface ErrorDialogContextValue {
  lastError: MediaError | null;
}

const ErrorDialogContext = createContext<ErrorDialogContextValue | null>(null);

export const ErrorDialogContextProvider = ErrorDialogContext.Provider;

export function useErrorDialogContext(): ErrorDialogContextValue {
  const ctx = useContext(ErrorDialogContext);
  if (!ctx) throw new Error('ErrorDialog compound components must be used within an ErrorDialog.Root');
  return ctx;
}
