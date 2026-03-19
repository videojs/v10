import { SpfMedia as SpfMediaDelegate } from '@videojs/spf/dom';
import { DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';

// This is used by the web component because it needs to extend HTMLElement!
export class SimpleHlsCustomMedia extends DelegateMixin(CustomVideoElement, SpfMediaDelegate) {}

// This is used by the React component.
export class SimpleHlsMedia extends DelegateMixin(VideoProxy, SpfMediaDelegate) {}
