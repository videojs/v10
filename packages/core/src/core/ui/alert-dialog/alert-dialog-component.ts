import { defineComponent } from '../manifest';
import { AlertDialogDataAttrs } from './alert-dialog-data-attrs';
import type { AlertDialogProps } from './props';

export default defineComponent({
  name: 'AlertDialog',
  parts: {
    Root: defineComponent<AlertDialogProps>(),
    Popup: defineComponent(),
    Title: defineComponent(),
    Description: defineComponent(),
    Close: defineComponent(),
  },
  dataAttrs: AlertDialogDataAttrs,
});
