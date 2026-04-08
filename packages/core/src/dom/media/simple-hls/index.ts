import { SpfMediaMixin } from '@videojs/spf/dom';
import { CustomVideoElement } from '../custom-media-element';
import { VideoProxy } from '../proxy';

// This is used to infer the props from.
export class SimpleHlsMediaBase extends SpfMediaMixin(EventTarget) {}

// This is used by the web component because it needs to extend HTMLElement!
export class SimpleHlsCustomMedia extends SpfMediaMixin(CustomVideoElement) {}

// This is used by the React component.
export class SimpleHlsMedia extends SpfMediaMixin(VideoProxy) {}
