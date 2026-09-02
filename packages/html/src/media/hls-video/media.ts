import { CustomMediaElement } from '@videojs/media/dom';
import { HlsVideoMedia } from '@videojs/spf/hls-video';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class HlsVideo extends MediaAttachMixin(CustomMediaElement('video', HlsVideoMedia)) {}
