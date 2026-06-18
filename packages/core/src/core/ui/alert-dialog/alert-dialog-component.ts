import { defineComponent } from '@videojs/compiler';
import type { AlertDialogProps } from './alert-dialog-core';
import { AlertDialogDataAttrs } from './alert-dialog-data-attrs';

export default defineComponent<AlertDialogProps>()({
  name: 'AlertDialog',
  parts: ['Root', 'Popup', 'Title', 'Description', 'Close'] as const,
  dataAttrs: AlertDialogDataAttrs,
});
