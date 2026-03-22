'use client';

import { selectError } from '@videojs/core/dom';
import { type ReactNode, useRef } from 'react';
import { usePlayer } from '@/player/context';
import { AlertDialog } from '@/ui/alert-dialog';

export interface ErrorDialogClasses {
  root?: string;
  dialog?: string;
  content?: string;
  title?: string;
  description?: string;
  actions?: string;
  close?: string;
}

export function ErrorDialog({ classes }: { classes?: ErrorDialogClasses }): ReactNode {
  const errorState = usePlayer(selectError);
  const lastError = useRef(errorState?.error);

  if (!errorState) return null;

  if (errorState?.error) lastError.current = errorState.error;

  return (
    <AlertDialog.Root
      open={!!errorState.error}
      onOpenChange={(open) => {
        if (!open) errorState.dismissError();
      }}
    >
      <AlertDialog.Popup className={classes?.root}>
        <div className={classes?.dialog}>
          <div className={classes?.content}>
            <AlertDialog.Title className={classes?.title}>Something went wrong.</AlertDialog.Title>
            <AlertDialog.Description className={classes?.description}>
              {lastError.current?.message ?? 'An error occurred while trying to play the video. Please try again.'}
            </AlertDialog.Description>
          </div>
          <div className={classes?.actions}>
            <AlertDialog.Close className={classes?.close}>OK</AlertDialog.Close>
          </div>
        </div>
      </AlertDialog.Popup>
    </AlertDialog.Root>
  );
}
