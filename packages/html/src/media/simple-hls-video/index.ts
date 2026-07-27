import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { SimpleHlsMedia } from '@videojs/media/dom/simple-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class SimpleHlsVideo extends MediaAttachMixin(CustomMediaElement('video', SimpleHlsMedia)) {}
