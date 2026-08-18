import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { HlsJsMedia } from '@videojs/media/dom/hls-js';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsJsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsJsMedia)) {}
