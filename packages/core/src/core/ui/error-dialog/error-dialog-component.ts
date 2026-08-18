import { defineComponent } from 'vjsc/components';

import { ErrorDialogDataAttrs } from './error-dialog-data-attrs';

export default defineComponent({
  name: 'ErrorDialog',
  root: 'Root',
  parts: {
    Root: defineComponent(),
    Popup: defineComponent(),
    Title: defineComponent(),
    Description: defineComponent(),
    Close: defineComponent(),
  },
  dataAttrs: ErrorDialogDataAttrs,
});
