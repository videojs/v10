import { CustomMediaElement } from '@videojs/media/dom';
import { NativeHlsMedia } from '@videojs/native-hls-video';

import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class NativeHlsVideo extends MediaAttachMixin(CustomMediaElement('video', NativeHlsMedia)) {}
