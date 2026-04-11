import { CustomMediaElement } from '@videojs/core/dom/media/custom-media-element';
import { NativeHlsMedia } from '@videojs/core/dom/media/native-hls';
import { MediaAttachMixin } from '../../store/media-attach-mixin';

export class NativeHlsVideo extends MediaAttachMixin(CustomMediaElement('video', NativeHlsMedia)) {}
