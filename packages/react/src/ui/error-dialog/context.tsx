'use client';

import type { MediaError } from '@videojs/core';
import { createContext, useContext } from 'react';

/** Error metadata exposed to ErrorDialog compound parts. */
export interface ErrorDialogContextValue {
  /** Most recent media error, or `null` before any error has occurred. */
  lastError: MediaError | null;
}

const ErrorDialogContext = createContext<ErrorDialogContextValue | null>(null);

export const ErrorDialogContextProvider = ErrorDialogContext.Provider;

/** Read the surrounding ErrorDialog context. Throws when used outside an `ErrorDialog.Root`. */
export function useErrorDialogContext(): ErrorDialogContextValue {
  const ctx = useContext(ErrorDialogContext);
  if (!ctx) throw new Error('ErrorDialog compound components must be used within an ErrorDialog.Root');
  return ctx;
}
