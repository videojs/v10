import type { Constructor, CustomElement } from '@open-wc/context-protocol';
import type { MediaStore } from '@videojs/core/store';

import { ProviderMixin } from '@open-wc/context-protocol';
import { createMediaStore } from '@videojs/core/store';

import { yieldConsoleBanner } from '@videojs/utils';
import { version } from '../../package.json';

yieldConsoleBanner(version);

const ProviderHTMLElement: Constructor<CustomElement & HTMLElement> = ProviderMixin(HTMLElement);

export class VideoProviderElement extends ProviderHTMLElement {
  contexts = {
    mediaStore: (): MediaStore => {
      return createMediaStore();
    },
  };
}
