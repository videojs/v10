import { SpfMedia as SpfMediaDelegate } from '@videojs/spf/dom';
import { MediaDelegateMixin } from '../../../core/media/delegate';
import { MediaProxyMixin } from '../../../core/media/proxy';
import { CustomMediaMixin } from '../custom-media-element';

// This is used by the web component because it needs to extend HTMLElement!
export class SimpleHlsCustomMedia extends MediaDelegateMixin(
  CustomMediaMixin(globalThis.HTMLElement ?? class {}, { tag: 'video' }),
  SpfMediaDelegate
) {}

// This is used by the React component.
export class SimpleHlsMedia extends MediaDelegateMixin(
  MediaProxyMixin(
    globalThis.HTMLVideoElement ?? class {},
    globalThis.HTMLMediaElement ?? class {},
    globalThis.EventTarget ?? class {}
  ),
  SpfMediaDelegate
) {}
