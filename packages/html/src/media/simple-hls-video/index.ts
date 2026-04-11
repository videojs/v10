import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { SimpleHlsMedia } from '@videojs/core/dom/media/simple-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class SimpleHlsVideo extends MediaAttachMixin(CustomMediaElement('video', SimpleHlsMedia)) {}
