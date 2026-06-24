import { defineComponent } from '../manifest';
import { ErrorDialogDataAttrs } from './error-dialog-data-attrs';
import type { ErrorDialogProps } from './props';

export default defineComponent({
  name: 'ErrorDialog',
  parts: {
    Root: defineComponent<ErrorDialogProps>(),
    Popup: defineComponent(),
    Title: defineComponent(),
    Description: defineComponent(),
    Close: defineComponent(),
  },
  dataAttrs: ErrorDialogDataAttrs,
});
