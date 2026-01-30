import type { Constructor, CustomElement } from '@open-wc/context-protocol';
import { ProviderMixin } from '@open-wc/context-protocol';
import type { PlayerStore } from '@videojs/store';
import { createPlayerStore } from '@videojs/store';

import { printConsoleBanner } from '@videojs/utils';
import { version } from '../../package.json';

printConsoleBanner(version);

const ProviderHTMLElement: Constructor<CustomElement & HTMLElement> = ProviderMixin(HTMLElement);

export class VideoProviderElement extends ProviderHTMLElement {
  contexts = {
    playerStore: (): PlayerStore => {
      return createPlayerStore();
    },
  };
}
