import { defineComponent } from '@videojs/jsx';

import { ErrorDialogDataAttrs } from './error-dialog-data-attrs';

export default defineComponent({
  name: 'ErrorDialog',
  parts: {
    Root: defineComponent(),
    Popup: defineComponent(),
    Title: defineComponent(),
    Description: defineComponent(),
    Close: defineComponent(),
  },
  dataAttrs: ErrorDialogDataAttrs,
});
