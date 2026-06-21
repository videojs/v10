import { defineComponent, defineComponentPart } from '../manifest';
import { ErrorDialogDataAttrs } from './error-dialog-data-attrs';
import type { ErrorDialogProps } from './props';

export default defineComponent()({
  name: 'ErrorDialog',
  parts: {
    Root: defineComponentPart<ErrorDialogProps>(),
    Popup: defineComponentPart(),
    Title: defineComponentPart(),
    Description: defineComponentPart(),
    Close: defineComponentPart(),
  },
  dataAttrs: ErrorDialogDataAttrs,
});
