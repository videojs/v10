import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { HlsMedia } from '../../../../core/dist/dev/dom/media/hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsMedia)) {}
