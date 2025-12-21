import type { Constructor, CustomElement } from '@open-wc/context-protocol';
import type { MediaStore } from '@videojs/core-preview/store';

import { ProviderMixin } from '@open-wc/context-protocol';
import { createMediaStore } from '@videojs/core-preview/store';

import { printConsoleBanner } from '@videojs/utils-preview';
import { version } from '../../package.json';

printConsoleBanner(version);

const ProviderHTMLElement: Constructor<CustomElement & HTMLElement> = ProviderMixin(HTMLElement);

export class VideoProviderElement extends ProviderHTMLElement {
  contexts = {
    mediaStore: (): MediaStore => {
      return createMediaStore();
    },
  };
}
