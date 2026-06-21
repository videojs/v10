import { defineComponent, defineComponentPart } from '../manifest';
import { AlertDialogDataAttrs } from './alert-dialog-data-attrs';
import type { AlertDialogProps } from './props';

export default defineComponent()({
  name: 'AlertDialog',
  parts: {
    Root: defineComponentPart<AlertDialogProps>(),
    Popup: defineComponentPart(),
    Title: defineComponentPart(),
    Description: defineComponentPart(),
    Close: defineComponentPart(),
  },
  dataAttrs: AlertDialogDataAttrs,
});
