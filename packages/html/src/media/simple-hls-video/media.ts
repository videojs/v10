import { CustomMediaElement } from '@videojs/media/dom/custom-media-element';
import { SimpleHlsMedia } from '@videojs/spf/simple-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class SimpleHlsVideo extends MediaAttachMixin(CustomMediaElement('video', SimpleHlsMedia)) {}
