import { defineComponent } from 'vjsc/components';

import { ErrorDialogDataAttrs } from './data';

export default defineComponent({
  name: 'ErrorDialog',
  root: 'Root',
  parts: {
    Root: defineComponent(),
    Backdrop: defineComponent(),
    Popup: defineComponent(),
    Title: defineComponent(),
    Description: defineComponent(),
    Close: defineComponent(),
  },
  dataAttrs: ErrorDialogDataAttrs,
});
