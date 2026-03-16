import { SpfMedia as SpfMediaDelegate } from '@videojs/spf/dom';
import { DelegateMixin } from '../../../core/media/delegate';
import { CustomMediaMixin } from '../custom-media-element';
import { MediaProxyMixin } from '../proxy';

// This is used by the web component because it needs to extend HTMLElement!
export class SimpleHlsCustomMedia extends DelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  SpfMediaDelegate
) {}

// This is used by the React component.
export class SimpleHlsMedia extends DelegateMixin(MediaProxyMixin, SpfMediaDelegate) {}
