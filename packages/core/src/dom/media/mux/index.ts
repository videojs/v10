import { type Delegate, DelegateMixin } from '../../../core/media/delegate';
import { CustomVideoElement } from '../custom-media-element';
import { HlsMedia } from '../hls';
import { VideoProxy } from '../proxy';

export class MuxMediaDelegate extends HlsMedia implements Delegate {}

export class MuxCustomMedia extends DelegateMixin(CustomVideoElement, MuxMediaDelegate) {}

export class MuxMedia extends DelegateMixin(VideoProxy, MuxMediaDelegate) {}
