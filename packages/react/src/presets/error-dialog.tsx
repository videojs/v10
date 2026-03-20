'use client';

import { selectError } from '@videojs/core/dom';
import { type ReactNode, useRef } from 'react';
import { usePlayer } from '@/player/context';
import { AlertDialog } from '@/ui/alert-dialog';

export interface ErrorDialogClassNames {
  root?: string;
  dialog?: string;
  content?: string;
  title?: string;
  description?: string;
  actions?: string;
  close?: string;
}

export function ErrorDialog({ classNames }: { classNames?: ErrorDialogClassNames }): ReactNode {
  const errorState = usePlayer(selectError);
  const lastError = useRef(errorState?.error);

  if (!errorState) return null;

  if (errorState?.error) lastError.current = errorState.error;

  return (
    <AlertDialog.Root
      open={Boolean(errorState.error)}
      onOpenChange={(open) => {
        if (!open) errorState.dismissError();
      }}
    >
      <AlertDialog.Popup className={classNames?.root}>
        <div className={classNames?.dialog}>
          <div className={classNames?.content}>
            <AlertDialog.Title className={classNames?.title}>Something went wrong.</AlertDialog.Title>
            <AlertDialog.Description className={classNames?.description}>
              {lastError.current?.message ?? 'An error occurred. Please try again.'}
            </AlertDialog.Description>
          </div>
          <div className={classNames?.actions}>
            <AlertDialog.Close className={classNames?.close}>OK</AlertDialog.Close>
          </div>
        </div>
      </AlertDialog.Popup>
    </AlertDialog.Root>
  );
}
