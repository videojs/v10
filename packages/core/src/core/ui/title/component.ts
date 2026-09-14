import { defineComponent } from 'vjsc/components';

import { TitleDataAttrs } from './data';

export default defineComponent({
  name: 'Title',
  root: 'Root',
  parts: {
    Root: defineComponent(),
    Value: defineComponent(),
  },
  dataAttrs: TitleDataAttrs,
});
