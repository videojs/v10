import type { AlertDialogProps } from '../alert-dialog/alert-dialog-core';
import { defineComponent } from '../manifest';
import { ErrorDialogDataAttrs } from './error-dialog-data-attrs';

export default defineComponent<AlertDialogProps>()({
  name: 'ErrorDialog',
  parts: ['Root', 'Popup', 'Title', 'Description', 'Close'] as const,
  dataAttrs: ErrorDialogDataAttrs,
});
